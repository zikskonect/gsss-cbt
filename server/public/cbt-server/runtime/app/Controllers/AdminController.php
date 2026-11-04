<?php
// server/app/controllers/AdminController.php
// Handles: academic years + form-teacher assignments

namespace App\Controllers;

use App\Db\Database;
use App\Helpers\Auth;
use App\Helpers\Request;
use App\Helpers\Response;
use App\Helpers\Validator;

class AdminController
{
    // ─── ACADEMIC YEARS ────────────────────────────────────

    /**
     * GET /api/years
     */
    public function listYears(array $params = []): void
    {
        $rows = Database::all(
            'SELECT year_id, label, is_current, started_at, closed_at, created_at
               FROM academic_years
              ORDER BY year_id DESC'
        );

        $current = null;
        foreach ($rows as $r) {
            if ((int) $r['is_current'] === 1) {
                $current = $r['year_id'];
                break;
            }
        }

        Response::ok([
            'years'         => $rows,
            'current_year'  => $current,
        ]);
    }

    /**
     * POST /api/years
     * Body: { label }  — e.g. '2026/2027'
     */
    public function createYear(array $params = []): void
    {
        $tokenRow = Auth::requireRole('exam_office');
        $input = Request::all();

        $v = new Validator($input);
        $v->required('label')->string('label', 6, 20);
        $v->validate();

        $label = trim($input['label']);
        if (!preg_match('/^\d{4}[\/\-]\d{4}$/', $label)) {
            Response::error('Year format must be YYYY/YYYY', 'validation_error', 422);
        }

        $yearId = str_replace(['/', ' '], '', $label);

        $existing = Database::one('SELECT year_id FROM academic_years WHERE year_id = ?', [$yearId]);
        if ($existing) Response::error('Year already exists', 'duplicate_year', 409);

        Database::insert('academic_years', [
            'year_id'     => $yearId,
            'label'       => $label,
            'is_current'  => 0,
            'started_at'  => null,
            'closed_at'   => null,
        ]);

        Auth::audit($tokenRow['user_phone'], $tokenRow['device_id'], 'year_created', $yearId);

        $year = Database::one('SELECT * FROM academic_years WHERE year_id = ?', [$yearId]);
        Response::ok(['year' => $year], 201);
    }

    /**
     * POST /api/years/:year_id/start
     * Archives all active students from the previous current year,
     * then makes the target year current.
     */
    public function startYear(array $params = []): void
    {
        $tokenRow = Auth::requireRole('exam_office');
        $yearId   = $params['year_id'] ?? '';

        $target = Database::one('SELECT * FROM academic_years WHERE year_id = ?', [$yearId]);
        if (!$target) Response::notFound('Year not found');

        if ((int) $target['is_current'] === 1) {
            Response::error('This year is already current', 'already_current', 409);
        }

        $current = Database::one('SELECT * FROM academic_years WHERE is_current = 1 LIMIT 1');

        Database::begin();

        try {
            $archived = 0;

            if ($current && $current['year_id'] !== $yearId) {
                // Archive active students of the old year
                $stmt = Database::run(
                    'UPDATE students
                        SET status = "archived", archived_at = NOW()
                      WHERE academic_year = ? AND status = "active"',
                    [$current['year_id']]
                );
                $archived = $stmt->rowCount();

                // Close old year
                Database::run(
                    'UPDATE academic_years SET is_current = 0, closed_at = NOW() WHERE year_id = ?',
                    [$current['year_id']]
                );
            }

            // Open new year
            Database::run(
                'UPDATE academic_years
                    SET is_current = 1,
                        started_at = NOW(),
                        closed_at  = NULL
                  WHERE year_id = ?',
                [$yearId]
            );

            Database::commit();
        } catch (\Throwable $e) {
            Database::rollback();
            Response::serverError('Failed to start year: ' . $e->getMessage());
        }

        Auth::audit($tokenRow['user_phone'], $tokenRow['device_id'], 'year_started', $yearId, [
            'archived_students' => $archived,
        ]);

        Response::ok([
            'year'              => $target,
            'archived_students' => $archived,
        ]);
    }

    // ─── FORM TEACHER ASSIGNMENTS ─────────────────────────

    /**
     * GET /api/assignments
     * Optional query: ?phone=08012345678 — filter by teacher
     */
    public function listAssignments(array $params = []): void
    {
        $phone = $_GET['phone'] ?? null;

        if ($phone) {
            $rows = Database::all(
                'SELECT * FROM form_teacher_assignments
                  WHERE teacher_phone = ?
                  ORDER BY academic_year DESC, class_code ASC, arm ASC',
                [$phone]
            );
        } else {
            $rows = Database::all(
                'SELECT * FROM form_teacher_assignments
                  ORDER BY academic_year DESC, class_code ASC, arm ASC'
            );
        }

        Response::ok(['assignments' => $rows]);
    }

    /**
     * POST /api/assignments
     * Body: { class_id, class_name, class_code, arm, teacher_name, teacher_phone, academic_year? }
     */
    public function createAssignment(array $params = []): void
    {
        $tokenRow = Auth::requireRole('exam_office');
        $input = Request::all();

        $v = new Validator($input);
        $v->required('class_code')->string('class_code', 1, 20)
          ->required('arm')->string('arm', 1, 3)
          ->required('teacher_name')->string('teacher_name', 2, 120)
          ->required('teacher_phone')->phone('teacher_phone')
          ->string('class_name', 0, 60)
          ->string('class_id', 0, 60)
          ->string('academic_year', 0, 20);
        $v->validate();

        $classCode = strtoupper(trim($input['class_code']));
        $arm       = strtoupper(trim($input['arm']));
        $teacherNm = trim($input['teacher_name']);
        $teacherPh = trim($input['teacher_phone']);

        // Determine academic year
        $year = $input['academic_year'] ?? null;
        if (!$year) {
            $current = Database::one('SELECT year_id FROM academic_years WHERE is_current = 1 LIMIT 1');
            if (!$current) {
                Response::error('No current academic year set', 'no_current_year', 400);
            }
            $year = $current['year_id'];
        }

        // Verify class exists
        $cls = Database::one('SELECT * FROM classes WHERE code = ?', [$classCode]);
        if (!$cls) Response::error('Class not found', 'class_not_found', 404);

        // Verify arm exists
        $armRow = Database::one('SELECT * FROM arms WHERE label = ?', [$arm]);
        if (!$armRow) Response::error('Arm not found', 'arm_not_found', 404);

        // Uniqueness: one form teacher per (class, arm, year)
        $collision = Database::one(
            'SELECT * FROM form_teacher_assignments
              WHERE class_code = ? AND arm = ? AND academic_year = ?',
            [$classCode, $arm, $year]
        );
        if ($collision) {
            Response::error(
                "Arm $arm of $classCode already has a form teacher for $year ({$collision['teacher_name']})",
                'slot_taken',
                409
            );
        }

        $assignmentId = 'fta_' . bin2hex(random_bytes(8));

        Database::insert('form_teacher_assignments', [
            'assignment_id' => $assignmentId,
            'class_id'      => $cls['class_id'],
            'class_name'    => $cls['name'],
            'class_code'    => $classCode,
            'arm'           => $arm,
            'teacher_name'  => $teacherNm,
            'teacher_phone' => $teacherPh,
            'academic_year' => $year,
            'assigned_by'   => $tokenRow['user_phone'],
        ]);

        Auth::audit(
            $tokenRow['user_phone'],
            $tokenRow['device_id'],
            'assignment_created',
            "$classCode/$arm/$year",
            ['teacher' => $teacherNm]
        );

        $assignment = Database::one(
            'SELECT * FROM form_teacher_assignments WHERE assignment_id = ?',
            [$assignmentId]
        );
        Response::ok(['assignment' => $assignment], 201);
    }

    /**
     * DELETE /api/assignments/:assignment_id
     */
    public function deleteAssignment(array $params = []): void
    {
        $tokenRow     = Auth::requireRole('exam_office');
        $assignmentId = $params['assignment_id'] ?? '';

        $a = Database::one(
            'SELECT * FROM form_teacher_assignments WHERE assignment_id = ?',
            [$assignmentId]
        );
        if (!$a) Response::notFound('Assignment not found');

        // Refuse if there are active students in this slot
        $inUse = Database::one(
            'SELECT COUNT(*) AS c FROM students
              WHERE class_code = ? AND arm = ? AND academic_year = ? AND status = "active"',
            [$a['class_code'], $a['arm'], $a['academic_year']]
        );
        if ($inUse && (int) $inUse['c'] > 0) {
            Response::error(
                "Cannot remove: {$inUse['c']} active student(s) are in {$a['class_name']} {$a['arm']}",
                'assignment_in_use',
                409
            );
        }

        Database::run('DELETE FROM form_teacher_assignments WHERE assignment_id = ?', [$assignmentId]);

        Auth::audit(
            $tokenRow['user_phone'],
            $tokenRow['device_id'],
            'assignment_deleted',
            "{$a['class_code']}/{$a['arm']}/{$a['academic_year']}"
        );

        Response::ok(['deleted' => true]);
    }
}