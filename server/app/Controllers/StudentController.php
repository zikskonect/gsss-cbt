<?php
// server/app/controllers/StudentController.php

namespace App\Controllers;

use App\Db\Database;
use App\Helpers\Auth;
use App\Helpers\Request;
use App\Helpers\Response;
use App\Helpers\Validator;

class StudentController
{
    /**
     * GET /api/students
     * Query: ?class_code=SS1&arm=A&year=2025/2026&status=active&registrar=080...
     */
    public function list(array $params = []): void
    {
        $tokenRow = Auth::requireAnyRole(['exam_office', 'form_teacher']);

        $where  = [];
        $params = [];

        // Form teachers are scoped to their assigned class+arm
        if ($tokenRow['role'] === 'form_teacher') {
            $phone = $tokenRow['user_phone'];
            $assignments = Database::all(
                'SELECT class_code, arm, academic_year FROM form_teacher_assignments WHERE teacher_phone = ?',
                [$phone]
            );
            if (empty($assignments)) {
                Response::ok(['students' => [], 'count' => 0]);
                return;
            }

            // Build OR conditions for each assignment
            $orParts = [];
            foreach ($assignments as $a) {
                $orParts[] = '(class_code = ? AND arm = ? AND academic_year = ?)';
                $params[]  = $a['class_code'];
                $params[]  = $a['arm'];
                $params[]  = $a['academic_year'];
            }
            $where[] = '(' . implode(' OR ', $orParts) . ')';
        } else {
            // Exam office: any filter they want
            if (!empty($_GET['class_code'])) {
                $where[]  = 'class_code = ?';
                $params[] = strtoupper(trim($_GET['class_code']));
            }
            if (!empty($_GET['arm'])) {
                $where[]  = 'arm = ?';
                $params[] = strtoupper(trim($_GET['arm']));
            }
            if (!empty($_GET['year'])) {
                $where[]  = 'academic_year = ?';
                $params[] = trim($_GET['year']);
            }
            if (!empty($_GET['registrar'])) {
                $where[]  = 'registered_by = ?';
                $params[] = trim($_GET['registrar']);
            }
        }

        if (!empty($_GET['status'])) {
            $where[]  = 'status = ?';
            $params[] = $_GET['status'];
        }

        $sql = 'SELECT * FROM students';
        if ($where) {
            $sql .= ' WHERE ' . implode(' AND ', $where);
        }
        $sql .= ' ORDER BY class_code ASC, arm ASC, serial ASC';

        $rows = Database::all($sql, $params);

        Response::ok([
            'students' => $rows,
            'count'    => count($rows),
        ]);
    }

    /**
     * GET /api/students/lookup?code=GSS/SS1/002
     * Public — used by student login. Does NOT require a token.
     */
    public function lookupByCode(array $params = []): void
    {
        $code = $_GET['code'] ?? '';
        if (!$code) {
            Response::error('code is required', 'validation_error', 422);
        }

        $normalized = strtoupper(trim(preg_replace('/\s+/', '', $code)));

        $student = Database::one(
            'SELECT student_id, exam_code, name, class_name, class_code, arm,
                    department_name, academic_year, status
               FROM students WHERE exam_code = ? LIMIT 1',
            [$normalized]
        );

        if (!$student) {
            Response::notFound('No student with that exam code');
        }

        // Only allow active students
        if ($student['status'] !== 'active') {
            Response::error(
                "This exam code is marked as {$student['status']}",
                'student_inactive',
                403
            );
        }

        Response::ok(['student' => $student]);
    }

    /**
     * GET /api/students/:student_id
     */
    public function getOne(array $params = []): void
    {
        Auth::requireAnyRole(['exam_office', 'form_teacher']);
        $studentId = $params['student_id'] ?? '';

        $student = Database::one('SELECT * FROM students WHERE student_id = ?', [$studentId]);
        if (!$student) Response::notFound('Student not found');

        Response::ok(['student' => $student]);
    }

        /**
     * POST /api/students
     * Form teacher OR exam office creates a student.
     * The exam code is generated server-side — clients do NOT send it.
     */
    public function create(array $params = []): void
    {
        $tokenRow = Auth::requireAnyRole(['exam_office', 'form_teacher']);
        $input = Request::all();

        $v = new Validator($input);
        $v->required('name')->string('name', 2, 120)
          ->required('class_code')->string('class_code', 1, 20)
          ->required('arm')->string('arm', 1, 3)
          ->string('academic_year', 0, 20)
          ->string('department_id', 0, 60)
          ->string('department_name', 0, 60);
        $v->validate();

        $name      = trim($input['name']);
        $classCode = strtoupper(trim($input['class_code']));
        $arm       = strtoupper(trim($input['arm']));
        $deptId    = $input['department_id'] ?? null;
        $deptName  = $input['department_name'] ?? null;

        // Determine academic year
        $year = $input['academic_year'] ?? null;
        if (!$year) {
            $current = Database::one('SELECT year_id FROM academic_years WHERE is_current = 1 LIMIT 1');
            if (!$current) Response::error('No current academic year set', 'no_current_year', 400);
            $year = $current['year_id'];
        }

        // Verify class + arm exist
        $cls = Database::one('SELECT * FROM classes WHERE code = ?', [$classCode]);
        if (!$cls) Response::error('Class not found', 'class_not_found', 404);

        $armRow = Database::one('SELECT * FROM arms WHERE label = ?', [$arm]);
        if (!$armRow) Response::error('Arm not found', 'arm_not_found', 404);

        // Form teacher must be assigned to this exact slot
        if ($tokenRow['role'] === 'form_teacher') {
            $assigned = Database::one(
                'SELECT 1 FROM form_teacher_assignments
                  WHERE teacher_phone = ? AND class_code = ? AND arm = ? AND academic_year = ?',
                [$tokenRow['user_phone'], $classCode, $arm, $year]
            );
            if (!$assigned) {
                Response::forbidden('You are not assigned to this class+arm');
            }
        }

        // Resolve department name if only ID provided
        if ($deptId && !$deptName) {
            $dept = Database::one('SELECT name FROM departments WHERE department_id = ?', [$deptId]);
            $deptName = $dept['name'] ?? null;
        }

        Database::begin();
        try {
            // Lock the CLASS row so concurrent registrations for this class serialize.
            $clsLocked = Database::one(
                'SELECT class_id FROM classes WHERE code = ? FOR UPDATE',
                [$classCode]
            );
            if (!$clsLocked) {
                Database::rollback();
                Response::error('Class not found', 'class_not_found', 404);
                return;
            }

            // Safe now: we hold the class lock, so no other request can compute the same serial.
            $maxRow = Database::one(
                'SELECT MAX(serial) AS max_serial
                   FROM students
                  WHERE class_code = ?',
                [$classCode]
            );
            $nextSerial = ($maxRow && $maxRow['max_serial'] !== null)
                ? ((int) $maxRow['max_serial']) + 1
                : 1;

            // Build exam code
            $config = $GLOBALS['APP_CONFIG'] ?? [];
            $schoolCode = $config['app']['school_code'] ?? 'SCH';
            $examCode = sprintf('%s/%s/%03d', $schoolCode, $classCode, $nextSerial);

            $studentId = 'stu_' . bin2hex(random_bytes(8));

            Database::insert('students', [
                'student_id'      => $studentId,
                'exam_code'       => $examCode,
                'name'            => $name,
                'class_id'        => $cls['class_id'],
                'class_name'      => $cls['name'],
                'class_code'      => $classCode,
                'arm'             => $arm,
                'department_id'   => $deptId,
                'department_name' => $deptName,
                'academic_year'   => $year,
                'serial'          => $nextSerial,
                'registered_by'   => $tokenRow['user_phone'],
                'status'          => 'active',
            ]);

            Database::commit();
        } catch (\Throwable $e) {
            Database::rollback();

            $msg = $e->getMessage();
            if (strpos($msg, 'exam_code') !== false
                || strpos($msg, 'uniq_class_year_serial') !== false
                || strpos($msg, 'Duplicate entry') !== false) {
                Response::error('Exam code collision, please retry', 'code_collision', 409);
                return;
            }
            Response::serverError('Failed to create student: ' . $msg);
            return;
        }

        $student = Database::one('SELECT * FROM students WHERE student_id = ?', [$studentId]);

        Auth::audit(
            $tokenRow['user_phone'],
            $tokenRow['device_id'],
            'student_created',
            $student['exam_code'],
            ['name' => $name, 'class' => "$classCode/$arm/$year"]
        );

        Response::ok(['student' => $student], 201);
    }

    /**
     * PATCH /api/students/:student_id
     * Allowed changes: name, department_id, department_name, status
     * Status transitions: active → removed | transferred
     *                     (archived is set automatically on year rollover)
     */
    public function update(array $params = []): void
    {
        $tokenRow  = Auth::requireAnyRole(['exam_office', 'form_teacher']);
        $studentId = $params['student_id'] ?? '';

        $student = Database::one('SELECT * FROM students WHERE student_id = ?', [$studentId]);
        if (!$student) Response::notFound('Student not found');

        // Form teacher must own this student (same slot)
        if ($tokenRow['role'] === 'form_teacher') {
            if ($student['registered_by'] !== $tokenRow['user_phone']
                && $student['academic_year'] !== null) {
                $assigned = Database::one(
                    'SELECT 1 FROM form_teacher_assignments
                      WHERE teacher_phone = ? AND class_code = ? AND arm = ? AND academic_year = ?',
                    [
                        $tokenRow['user_phone'],
                        $student['class_code'],
                        $student['arm'],
                        $student['academic_year'],
                    ]
                );
                if (!$assigned) {
                    Response::forbidden('You do not manage this student');
                }
            }
        }

        $input  = Request::all();
        $updates = [];

        if (isset($input['name'])) {
            $name = trim($input['name']);
            if (mb_strlen($name) < 2) Response::error('Name too short', 'validation_error', 422);
            $updates['name'] = $name;
        }

        if (isset($input['department_id']) || isset($input['department_name'])) {
            $deptId = $input['department_id'] ?? null;
            $deptName = $input['department_name'] ?? null;
            if ($deptId && !$deptName) {
                $dept = Database::one('SELECT name FROM departments WHERE department_id = ?', [$deptId]);
                $deptName = $dept['name'] ?? null;
            }
            $updates['department_id']   = $deptId;
            $updates['department_name'] = $deptName;
        }

        if (isset($input['status'])) {
            $newStatus = $input['status'];
            $allowed = ['active', 'removed', 'transferred'];
            if (!in_array($newStatus, $allowed, true)) {
                Response::error('Invalid status', 'validation_error', 422);
            }

            $updates['status'] = $newStatus;

            // Timestamp the transition
            if ($newStatus === 'removed') {
                $updates['removed_at'] = date('Y-m-d H:i:s');
            } elseif ($newStatus === 'transferred') {
                $updates['transferred_at'] = date('Y-m-d H:i:s');
            }
        }

        if (empty($updates)) {
            Response::error('No valid fields to update', 'no_updates', 400);
        }

        // Build UPDATE
        $sets   = [];
        $params = [];
        foreach ($updates as $k => $v) {
            $sets[]   = "`$k` = ?";
            $params[] = $v;
        }
        $params[] = $studentId;

        Database::run(
            'UPDATE students SET ' . implode(', ', $sets) . ' WHERE student_id = ?',
            $params
        );

        Auth::audit(
            $tokenRow['user_phone'],
            $tokenRow['device_id'],
            'student_updated',
            $student['exam_code'],
            $updates
        );

        $updated = Database::one('SELECT * FROM students WHERE student_id = ?', [$studentId]);
        Response::ok(['student' => $updated]);
    }

    /**
     * DELETE /api/students/:student_id
     * Exam office only — hard delete. Normally you'd use PATCH status instead.
     */
    public function delete(array $params = []): void
    {
        $tokenRow  = Auth::requireRole('exam_office');
        $studentId = $params['student_id'] ?? '';

        $student = Database::one('SELECT * FROM students WHERE student_id = ?', [$studentId]);
        if (!$student) Response::notFound('Student not found');

        Database::run('DELETE FROM students WHERE student_id = ?', [$studentId]);

        Auth::audit(
            $tokenRow['user_phone'],
            $tokenRow['device_id'],
            'student_deleted',
            $student['exam_code']
        );

        Response::ok(['deleted' => true]);
    }
}