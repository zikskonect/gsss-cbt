<?php
// server/app/controllers/ClassController.php
// Handles: classes, arms, departments

namespace App\Controllers;

use App\Db\Database;
use App\Helpers\Auth;
use App\Helpers\Request;
use App\Helpers\Response;
use App\Helpers\Validator;

class ClassController
{
    // ─── CLASSES ───────────────────────────────────────────

    /**
     * GET /api/classes
     */
    public function listClasses(array $params = []): void
    {
        $rows = Database::all(
            'SELECT class_id, name, code, level, display_order AS `order`, created_at
               FROM classes
              ORDER BY display_order ASC, name ASC'
        );
        Response::ok(['classes' => $rows]);
    }

    /**
     * POST /api/classes
     * Body: { name, code, level?, order? }
     */
    public function createClass(array $params = []): void
    {
        $tokenRow = Auth::requireRole('exam_office');
        $input = Request::all();

        $v = new Validator($input);
        $v->required('name')->string('name', 1, 60)
          ->required('code')->string('code', 1, 20)
          ->string('level', 0, 20)
          ->int('order', 0, 9999);
        $v->validate();

        $name  = trim($input['name']);
        $code  = strtoupper(trim($input['code']));
        $level = isset($input['level']) ? strtoupper(trim($input['level'])) : null;
        $order = isset($input['order']) ? (int) $input['order'] : 999;

        if (!preg_match('/^[A-Z0-9]+$/', $code)) {
            Response::error('Class code must be letters/numbers only', 'validation_error', 422);
        }

        $existing = Database::one('SELECT class_id FROM classes WHERE code = ?', [$code]);
        if ($existing) {
            Response::error('Class code already in use', 'duplicate_code', 409);
        }

        $classId = 'cls_' . strtolower($code) . '_' . bin2hex(random_bytes(4));

        Database::insert('classes', [
            'class_id'      => $classId,
            'name'          => $name,
            'code'          => $code,
            'level'         => $level,
            'display_order' => $order,
        ]);

        Auth::audit($tokenRow['user_phone'], $tokenRow['device_id'], 'class_created', $code);

        $cls = Database::one('SELECT class_id, name, code, level, display_order AS `order`, created_at
                                FROM classes WHERE class_id = ?', [$classId]);
        Response::ok(['class' => $cls], 201);
    }

    /**
     * DELETE /api/classes/:class_id
     */
    public function deleteClass(array $params = []): void
    {
        $tokenRow = Auth::requireRole('exam_office');
        $classId  = $params['class_id'] ?? '';

        $cls = Database::one('SELECT * FROM classes WHERE class_id = ?', [$classId]);
        if (!$cls) Response::notFound('Class not found');

        // Refuse if active students exist
        $inUse = Database::one(
            'SELECT COUNT(*) AS c FROM students
              WHERE class_code = ? AND status = "active"',
            [$cls['code']]
        );
        if ($inUse && (int) $inUse['c'] > 0) {
            Response::error(
                "Cannot delete: {$inUse['c']} active student(s) are in this class",
                'class_in_use',
                409
            );
        }

        // Refuse if assignments exist
        $assigned = Database::one(
            'SELECT COUNT(*) AS c FROM form_teacher_assignments WHERE class_code = ?',
            [$cls['code']]
        );
        if ($assigned && (int) $assigned['c'] > 0) {
            Response::error(
                'Cannot delete: form teachers are assigned to this class',
                'class_in_use',
                409
            );
        }

        Database::run('DELETE FROM classes WHERE class_id = ?', [$classId]);
        Auth::audit($tokenRow['user_phone'], $tokenRow['device_id'], 'class_deleted', $cls['code']);

        Response::ok(['deleted' => true]);
    }

    // ─── ARMS ──────────────────────────────────────────────

    /**
     * GET /api/arms
     */
    public function listArms(array $params = []): void
    {
        $rows = Database::all(
            'SELECT arm_id, label, display_order AS `order`, created_at
               FROM arms ORDER BY display_order ASC, label ASC'
        );
        Response::ok(['arms' => $rows]);
    }

    /**
     * POST /api/arms
     * Body: { label, order? }
     */
    public function createArm(array $params = []): void
    {
        $tokenRow = Auth::requireRole('exam_office');
        $input = Request::all();

        $v = new Validator($input);
        $v->required('label')->string('label', 1, 3)
          ->int('order', 0, 9999);
        $v->validate();

        $label = strtoupper(trim($input['label']));
        $order = isset($input['order']) ? (int) $input['order'] : 999;

        if (!preg_match('/^[A-Z0-9]{1,3}$/', $label)) {
            Response::error('Arm must be 1–3 letters/numbers', 'validation_error', 422);
        }

        $existing = Database::one('SELECT arm_id FROM arms WHERE label = ?', [$label]);
        if ($existing) Response::error('Arm already exists', 'duplicate_arm', 409);

        $armId = 'arm_' . strtolower($label) . '_' . bin2hex(random_bytes(4));

        Database::insert('arms', [
            'arm_id'        => $armId,
            'label'         => $label,
            'display_order' => $order,
        ]);

        Auth::audit($tokenRow['user_phone'], $tokenRow['device_id'], 'arm_created', $label);

        $arm = Database::one('SELECT arm_id, label, display_order AS `order`, created_at
                                FROM arms WHERE arm_id = ?', [$armId]);
        Response::ok(['arm' => $arm], 201);
    }

    /**
     * DELETE /api/arms/:arm_id
     */
    public function deleteArm(array $params = []): void
    {
        $tokenRow = Auth::requireRole('exam_office');
        $armId    = $params['arm_id'] ?? '';

        $arm = Database::one('SELECT * FROM arms WHERE arm_id = ?', [$armId]);
        if (!$arm) Response::notFound('Arm not found');

        $inUse = Database::one(
            'SELECT COUNT(*) AS c FROM students WHERE arm = ? AND status = "active"',
            [$arm['label']]
        );
        if ($inUse && (int) $inUse['c'] > 0) {
            Response::error(
                "Cannot delete: {$inUse['c']} active student(s) use arm {$arm['label']}",
                'arm_in_use',
                409
            );
        }

        Database::run('DELETE FROM arms WHERE arm_id = ?', [$armId]);
        Auth::audit($tokenRow['user_phone'], $tokenRow['device_id'], 'arm_deleted', $arm['label']);

        Response::ok(['deleted' => true]);
    }

    // ─── DEPARTMENTS ───────────────────────────────────────

    /**
     * GET /api/departments
     */
    public function listDepartments(array $params = []): void
    {
        $rows = Database::all(
            'SELECT department_id, name, display_order AS `order`, created_at
               FROM departments ORDER BY display_order ASC, name ASC'
        );
        Response::ok(['departments' => $rows]);
    }

    /**
     * POST /api/departments
     * Body: { name, order? }
     */
    public function createDepartment(array $params = []): void
    {
        $tokenRow = Auth::requireRole('exam_office');
        $input = Request::all();

        $v = new Validator($input);
        $v->required('name')->string('name', 1, 60)
          ->int('order', 0, 9999);
        $v->validate();

        $name  = trim($input['name']);
        $order = isset($input['order']) ? (int) $input['order'] : 999;

        $existing = Database::one(
            'SELECT department_id FROM departments WHERE LOWER(name) = LOWER(?)',
            [$name]
        );
        if ($existing) Response::error('Department already exists', 'duplicate_department', 409);

        $deptId = 'dept_' . preg_replace('/[^a-z0-9]/', '', strtolower($name)) . '_' . bin2hex(random_bytes(4));

        Database::insert('departments', [
            'department_id' => $deptId,
            'name'          => $name,
            'display_order' => $order,
        ]);

        Auth::audit($tokenRow['user_phone'], $tokenRow['device_id'], 'department_created', $name);

        $dept = Database::one('SELECT department_id, name, display_order AS `order`, created_at
                                 FROM departments WHERE department_id = ?', [$deptId]);
        Response::ok(['department' => $dept], 201);
    }

    /**
     * DELETE /api/departments/:department_id
     */
    public function deleteDepartment(array $params = []): void
    {
        $tokenRow = Auth::requireRole('exam_office');
        $deptId   = $params['department_id'] ?? '';

        $dept = Database::one('SELECT * FROM departments WHERE department_id = ?', [$deptId]);
        if (!$dept) Response::notFound('Department not found');

        $inUse = Database::one(
            'SELECT COUNT(*) AS c FROM students WHERE department_id = ? AND status = "active"',
            [$deptId]
        );
        if ($inUse && (int) $inUse['c'] > 0) {
            Response::error(
                "Cannot delete: {$inUse['c']} active student(s) belong to {$dept['name']}",
                'department_in_use',
                409
            );
        }

        Database::run('DELETE FROM departments WHERE department_id = ?', [$deptId]);
        Auth::audit($tokenRow['user_phone'], $tokenRow['device_id'], 'department_deleted', $dept['name']);

        Response::ok(['deleted' => true]);
    }
}