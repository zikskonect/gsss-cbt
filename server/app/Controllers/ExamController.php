<?php
// server/app/controllers/ExamController.php

namespace App\Controllers;

use App\Db\Database;
use App\Helpers\Auth;
use App\Helpers\Request;
use App\Helpers\Response;
use App\Helpers\Validator;
use App\Ws\WsHub;

class ExamController
{
    /**
     * GET /api/exams
     * Query: ?class=SS1&type=EXAM&pushed=1
     * Teachers see only their own exams; exam_office sees all.
     */
    public function list(array $params = []): void
    {
        $tokenRow = Auth::requireAnyRole(['teacher', 'exam_office']);
        $where = [];
        $params = [];

        if ($tokenRow['role'] === 'teacher') {
            $where[]  = 'created_by = ?';
            $params[] = $tokenRow['user_phone'];
        } else {
            if (!empty($_GET['class'])) {
                $where[]  = 'class_name = ?';
                $params[] = trim($_GET['class']);
            }
        }

        if (!empty($_GET['type'])) {
            $where[]  = 'assessment_type = ?';
            $params[] = strtoupper(trim($_GET['type']));
        }

        if (isset($_GET['pushed'])) {
            $where[]  = 'pushed_to_clients = ?';
            $params[] = (int) $_GET['pushed'] ? 1 : 0;
        }

        $sql = 'SELECT exam_id, subject, class_name, duration, assessment_type,
                       scheduled_date, created_by, created_date,
                       pushed_to_clients, pushed_at, updated_at,
                       LENGTH(questions_json) AS questions_bytes
                  FROM exams';
        if ($where) $sql .= ' WHERE ' . implode(' AND ', $where);
        $sql .= ' ORDER BY updated_at DESC';

        $rows = Database::all($sql, $params);

        Response::ok([
            'exams' => $rows,
            'count' => count($rows),
        ]);
    }

    /**
     * POST /api/exams
     * Body: { exam_id?, subject, class_name, duration, assessment_type,
     *         scheduled_date?, created_by?, questions: [...] }
     *
     * If exam_id exists → replace.
     */
    public function create(array $params = []): void
    {
        $tokenRow = Auth::requireAnyRole(['teacher', 'exam_office']);
        $input = Request::all();

        $v = new Validator($input);
        $v->required('subject')->string('subject', 1, 120)
          ->required('class_name')->string('class_name', 1, 60)
          ->required('duration')->int('duration', 1, 600)
          ->in('assessment_type', ['CA', 'EXAM'])
          ->string('exam_id', 0, 80)
          ->string('scheduled_date', 0, 20);
        $v->validate();

        $questions = $input['questions'] ?? null;
        if (!is_array($questions) || count($questions) === 0) {
            Response::error('questions array is required', 'validation_error', 422);
        }

        $subject        = trim($input['subject']);
        $className      = trim($input['class_name']);
        $duration       = (int) $input['duration'];
        $assessmentType = strtoupper($input['assessment_type'] ?? 'EXAM');
        $scheduledDate  = !empty($input['scheduled_date']) ? $input['scheduled_date'] : null;

        // Verify class exists
        $cls = Database::one('SELECT class_id FROM classes WHERE code = ? OR name = ? LIMIT 1',
                             [$className, $className]);
        if (!$cls) {
            // Not fatal — allow free-form class names for legacy exams
        }

        // Build exam_id if not provided
        $examId = !empty($input['exam_id'])
            ? trim($input['exam_id'])
            : 'exam_' . strtolower(preg_replace('/[^a-z0-9]/i', '', $subject))
              . '_' . strtolower(preg_replace('/[^a-z0-9]/i', '', $className))
              . '_' . $assessmentType
              . '_' . date('Ymd_His');

        $questionsJson = json_encode($questions, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);

        $existing = Database::one('SELECT exam_id FROM exams WHERE exam_id = ?', [$examId]);

        if ($existing) {
            Database::run(
                'UPDATE exams
                    SET subject = ?, class_name = ?, duration = ?,
                        assessment_type = ?, scheduled_date = ?,
                        questions_json = ?,
                        pushed_to_clients = 0, pushed_at = NULL
                  WHERE exam_id = ?',
                [$subject, $className, $duration, $assessmentType, $scheduledDate,
                 $questionsJson, $examId]
            );
            $action = 'exam_updated';
        } else {
            Database::insert('exams', [
                'exam_id'          => $examId,
                'subject'          => $subject,
                'class_name'       => $className,
                'duration'         => $duration,
                'assessment_type'  => $assessmentType,
                'scheduled_date'   => $scheduledDate,
                'created_by'       => $tokenRow['user_phone'] ?? 'system',
                'created_date'     => date('Y-m-d'),
                'questions_json'   => $questionsJson,
                'pushed_to_clients'=> 0,
            ]);
            $action = 'exam_created';
        }

        Auth::audit(
            $tokenRow['user_phone'],
            $tokenRow['device_id'],
            $action,
            $examId,
            ['subject' => $subject, 'class' => $className, 'q_count' => count($questions)]
        );

        // Broadcast to connected clients so admin dashboards refresh
        WsHub::broadcast([
            'type'    => 'exam.changed',
            'exam_id' => $examId,
            'action'  => $action,
        ]);

        $exam = Database::one(
            'SELECT exam_id, subject, class_name, duration, assessment_type,
                    scheduled_date, created_by, created_date, pushed_to_clients, pushed_at
               FROM exams WHERE exam_id = ?',
            [$examId]
        );

        Response::ok(['exam' => $exam, 'action' => $action], $existing ? 200 : 201);
    }

    /**
     * POST /api/exams/push
     * Body: { exam_ids: [...], target_class?: 'SS1' }  OR  { all: true }
     *
     * Marks exams as pushed_to_clients = 1, records the time, and
     * broadcasts a WebSocket message so clients know to sync down.
     */
    public function pushToDevices(array $params = []): void
    {
        $tokenRow = Auth::requireRole('exam_office');
        $input = Request::all();

        $examIds = [];
        $publishLimit = isset($input['questions_to_publish']) ? (int) $input['questions_to_publish'] : null;

        if (!empty($input['all']) && $input['all']) {
            $rows = Database::all('SELECT exam_id FROM exams WHERE pushed_to_clients = 0 AND scheduled_date IS NOT NULL');
            $examIds = array_column($rows, 'exam_id');
        } elseif (!empty($input['exam_ids']) && is_array($input['exam_ids'])) {
            $examIds = $input['exam_ids'];
        } elseif (!empty($input['exam_id'])) {
            $examIds = [$input['exam_id']];
        }

        if (empty($examIds)) {
            Response::error('No exams matched the push criteria', 'nothing_to_push', 400);
        }

        // Mark as pushed
        $placeholders = implode(',', array_fill(0, count($examIds), '?'));
        $sql = "UPDATE exams SET pushed_to_clients = 1, pushed_at = NOW()";
        $sqlParams = [];

        if ($publishLimit !== null) {
            $sql .= ", questions_to_publish = ?";
            $sqlParams[] = $publishLimit;
        }

        $sql .= " WHERE exam_id IN ($placeholders)";
        $sqlParams = array_merge($sqlParams, $examIds);

        Database::run($sql, $sqlParams);

        Auth::audit(
            $tokenRow['user_phone'],
            $tokenRow['device_id'],
            'exams_pushed',
            null,
            ['count' => count($examIds), 'limit' => $publishLimit]
        );

        // Broadcast to clients so they pull immediately
        WsHub::broadcast([
            'type'     => 'exams.pushed',
            'exam_ids' => $examIds,
            'count'    => count($examIds),
            'pushed_by'=> $tokenRow['user_phone'],
        ]);

        Response::ok([
            'pushed'   => count($examIds),
            'exam_ids' => $examIds,
        ]);
    }

    /**
     * GET /api/exams/for-device
     * Called by clients to fetch exams that have been pushed.
     * Query: ?class_name=SS1&since=2025-10-15T00:00:00Z
     */
    public function forDevice(array $params = []): void
    {
        // Tokens optional here — students log in with exam code only,
        // and this endpoint is called with the exam code in the query.
        // Auth is enforced via the code belonging to an active student.

        $examCode  = $_GET['exam_code'] ?? null;
        $className = $_GET['class_name'] ?? null;
        $since     = $_GET['since'] ?? null;

        if ($examCode) {
            $student = Database::one(
                'SELECT class_name, class_code, status FROM students WHERE exam_code = ? LIMIT 1',
                [$examCode]
            );
            if (!$student) Response::error('Invalid exam code', 'invalid_code', 401);
            if ($student['status'] !== 'active') {
                Response::error("Student is {$student['status']}", 'student_inactive', 403);
            }
            $className = $student['class_name'];
        }

        if (!$className) {
            Response::error('class_name or exam_code required', 'validation_error', 422);
        }

        $where  = ['pushed_to_clients = 1'];
        $params = ['class_name' => $className];

        // Only exams whose scheduled_date is today or earlier
        $where[] = '(scheduled_date IS NULL OR scheduled_date <= CURDATE())';

        if ($since) {
            $where[] = 'pushed_at > ?';
            $params[] = $since;
        }

        // Param array must be indexed, so build manually
        $sqlParams = [];
        $sql = 'SELECT exam_id, subject, class_name, duration, assessment_type,
                       scheduled_date, questions_json, pushed_at
                  FROM exams WHERE ';
        $sqlWhere = [];
        foreach ($where as $i => $w) {
            if (strpos($w, '?') !== false) {
                $sqlWhere[] = $w;
            } else {
                $sqlWhere[] = $w;
            }
        }
        // Rebuild simple version:
        $sql = 'SELECT exam_id, subject, class_name, duration, assessment_type,
                       scheduled_date, questions_json, pushed_at
                  FROM exams
                 WHERE pushed_to_clients = 1
                   AND class_name = ?
                   AND (scheduled_date IS NULL OR scheduled_date <= CURDATE())';
        $sqlParams = [$className];

        if ($since) {
            $sql .= ' AND pushed_at > ?';
            $sqlParams[] = $since;
        }

        $sql .= ' ORDER BY scheduled_date ASC, subject ASC';

        $rows = Database::all($sql, $sqlParams);

        // Decode questions JSON for each exam
        foreach ($rows as &$r) {
            $r['questions'] = json_decode($r['questions_json'], true) ?: [];
            unset($r['questions_json']);
        }

        Response::ok([
            'exams'      => $rows,
            'count'      => count($rows),
            'class_name' => $className,
            'server_time'=> date('c'),
        ]);
    }

    public function listQuestions($params = []) {
    try {
            $pdo = \App\Db\Database::pdo();
            $examId = $_GET['exam_id'] ?? null;
            if ($examId) {
                $stmt = $pdo->prepare("SELECT * FROM questions WHERE exam_id = ?");
                $stmt->execute([$examId]);
            } else {
                $stmt = $pdo->query("SELECT * FROM questions ORDER BY id DESC");
            }
            $questions = $stmt->fetchAll(\PDO::FETCH_ASSOC);
            \App\Helpers\Response::json(['ok' => true, 'data' => $questions, 'count' => count($questions)]);
        } catch (\Throwable $e) {
            \App\Helpers\Response::json(['ok' => false, 'error' => $e->getMessage()], 500);
        }
    }
}