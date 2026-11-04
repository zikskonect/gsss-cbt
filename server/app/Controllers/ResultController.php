<?php
// server/app/controllers/ResultController.php

namespace App\Controllers;

use App\Db\Database;
use App\Helpers\Auth;
use App\Helpers\Request;
use App\Helpers\Response;
use App\Helpers\Validator;
use App\Ws\WsHub;

class ResultController
{
    /**
     * GET /api/results/check?exam_id=&exam_code=
     * Student-facing duplicate-attempt check.
     */
    public function checkAttempt(array $params = []): void
    {
        $examId = trim($_GET['exam_id'] ?? '');
        $examCode = strtoupper(trim(preg_replace('/\s+/', '', $_GET['exam_code'] ?? '')));
        if ($examId === '' || $examCode === '') {
            Response::error('exam_id and exam_code are required', 'validation_error', 422);
        }

        $existing = Database::one(
            'SELECT result_id, submitted_at
               FROM results
              WHERE exam_id = ? AND exam_code = ?
              LIMIT 1',
            [$examId, $examCode]
        );

        Response::ok([
            'taken' => (bool) $existing,
            'submitted_at' => $existing['submitted_at'] ?? null,
        ]);
    }

    /**
     * POST /api/results
     * Client submits a result after a student finishes an exam.
     * Body: {
     *   result_id, exam_id, exam_subject?, student_name, student_class, student_arms?,
     *   exam_code, score, total, percentage, duration_taken,
     *   answers, exam_details, submitted_at?, device_id?
     * }
     *
     * Idempotent: submitting the same (exam_id, exam_code) again updates
     * the existing row rather than failing.
     */
    public function submit(array $params = []): void
    {
        $input = Request::all();

        $v = new Validator($input);
        $v->required('result_id')->string('result_id', 6, 80)
          ->required('exam_id')->string('exam_id', 1, 80)
          ->required('student_name')->string('student_name', 1, 120)
          ->required('exam_code')->string('exam_code', 6, 40)
          ->required('score')->int('score', 0)
          ->required('total')->int('total', 1)
          ->required('percentage')->int('percentage', 0, 100)
          ->int('duration_taken', 0)
          ->string('student_class', 0, 60)
          ->string('student_arms', 0, 3)
          ->string('exam_subject', 0, 120)
          ->string('submitted_at', 0, 40)
          ->string('device_id', 0, 60);
        $v->validate();

        // Verify student exists and is active
        $student = Database::one(
            'SELECT student_id, status, class_name, arm, name
               FROM students WHERE exam_code = ? LIMIT 1',
            [$input['exam_code']]
        );
        if (!$student) {
            Response::error('Unknown exam code', 'invalid_code', 400);
        }
        if ($student['status'] !== 'active') {
            Response::error("Student is {$student['status']}", 'student_inactive', 403);
        }

        // Verify exam exists
        $exam = Database::one(
            'SELECT exam_id FROM exams WHERE exam_id = ? LIMIT 1',
            [$input['exam_id']]
        );
        if (!$exam) {
            Response::error('Unknown exam', 'invalid_exam', 400);
        }

        $answersJson     = json_encode($input['answers'] ?? [],      JSON_UNESCAPED_UNICODE);
        $examDetailsJson = json_encode($input['exam_details'] ?? [], JSON_UNESCAPED_UNICODE);

        // Normalise submitted_at
        $submittedAt = $input['submitted_at'] ?? null;
        if ($submittedAt) {
            $ts = strtotime($submittedAt);
            if ($ts !== false) {
                $submittedAt = date('Y-m-d H:i:s', $ts);
            } else {
                $submittedAt = null;
            }
        }
        if (!$submittedAt) $submittedAt = date('Y-m-d H:i:s');

        // Idempotency: check existing (exam_id, exam_code)
        $existing = Database::one(
            'SELECT result_id FROM results WHERE exam_id = ? AND exam_code = ? LIMIT 1',
            [$input['exam_id'], $input['exam_code']]
        );

        if ($existing) {
            Response::error(
                'This exam has already been taken with this exam code',
                'exam_already_taken',
                409
            );
        } else {
            // Insert new
            $resultId = $input['result_id'];

            // If result_id collides with someone else's, generate a fresh one
            $collision = Database::one('SELECT result_id FROM results WHERE result_id = ?', [$resultId]);
            if ($collision) {
                $resultId = 'result_' . bin2hex(random_bytes(10));
            }

            Database::insert('results', [
                'result_id'         => $resultId,
                'exam_id'           => $input['exam_id'],
                'exam_subject'      => $input['exam_subject'] ?? null,
                'student_id'        => $student['student_id'],
                'exam_code'         => $input['exam_code'],
                'student_name'      => $input['student_name'],
                'student_class'     => $input['student_class'] ?? $student['class_name'],
                'student_arms'      => $input['student_arms'] ?? $student['arm'],
                'score'             => (int) $input['score'],
                'total'             => (int) $input['total'],
                'percentage'        => (int) $input['percentage'],
                'duration_taken'    => (int) ($input['duration_taken'] ?? 0),
                'answers_json'      => $answersJson,
                'exam_details_json' => $examDetailsJson,
                'device_id'         => $input['device_id'] ?? null,
                'submitted_at'      => $submittedAt,
            ]);
            $action = 'created';
        }

        Auth::audit(
            null,
            $input['device_id'] ?? null,
            'result_submitted',
            $resultId,
            ['exam_id' => $input['exam_id'], 'exam_code' => $input['exam_code'], 'score' => $input['score']]
        );

        // Broadcast to admin dashboards
        WsHub::broadcast([
            'type'        => 'result.submitted',
            'result_id'   => $resultId,
            'exam_id'     => $input['exam_id'],
            'exam_code'   => $input['exam_code'],
            'student_name'=> $input['student_name'],
            'score'       => (int) $input['score'],
            'total'       => (int) $input['total'],
            'percentage'  => (int) $input['percentage'],
        ]);

        Response::ok([
            'result_id' => $resultId,
            'action'    => $action,
        ], $action === 'created' ? 201 : 200);
    }

    /**
     * GET /api/results
     * Query: ?exam_id=&class=&exam_code=&since=&limit=
     * Exam office sees everything; teachers see results for their exams.
     */
    public function list(array $params = []): void
    {
        $tokenRow = Auth::requireAnyRole(['teacher', 'exam_office']);

        $where = [];
        $sqlParams = [];

        if ($tokenRow['role'] === 'teacher') {
            $where[] = 'e.created_by = ?';
            $sqlParams[] = $tokenRow['user_phone'];
        }

        if (!empty($_GET['exam_id'])) {
            $where[] = 'r.exam_id = ?';
            $sqlParams[] = $_GET['exam_id'];
        }
        if (!empty($_GET['class'])) {
            $where[] = 'r.student_class = ?';
            $sqlParams[] = $_GET['class'];
        }
        if (!empty($_GET['exam_code'])) {
            $where[] = 'r.exam_code = ?';
            $sqlParams[] = $_GET['exam_code'];
        }
        if (!empty($_GET['since'])) {
            $where[] = 'r.submitted_at > ?';
            $sqlParams[] = $_GET['since'];
        }

        $limit = isset($_GET['limit']) ? min(500, (int) $_GET['limit']) : 200;

        $sql = 'SELECT r.result_id, r.exam_id, r.exam_subject, r.exam_code,
                       r.student_name, r.student_class, r.student_arms,
                       r.score, r.total, r.percentage, r.duration_taken,
                       r.submitted_at, r.harvested_at, r.device_id
                  FROM results r
                  JOIN exams e ON e.exam_id = r.exam_id';

        if ($where) $sql .= ' WHERE ' . implode(' AND ', $where);
        $sql .= ' ORDER BY r.submitted_at DESC LIMIT ' . $limit;

        $rows = Database::all($sql, $sqlParams);

        Response::ok([
            'results' => $rows,
            'count'   => count($rows),
        ]);
    }

    /**
     * POST /api/results/harvest
     * Exam office triggers a bulk harvest.
     * Marks all unharvested results as harvested_at = NOW() and returns them.
     * Clients use this to sync results that were created on other devices.
     * Body (optional): { since: ISO8601 }
     */
    public function harvest(array $params = []): void
    {
        $tokenRow = Auth::requireRole('exam_office');
        $input = Request::all();

        $since = $input['since'] ?? null;

        // Find unharvested
        $where = ['harvested_at IS NULL'];
        $sqlParams = [];

        if ($since) {
            $where[] = 'submitted_at > ?';
            $sqlParams[] = $since;
        }

        $sql = 'SELECT * FROM results WHERE ' . implode(' AND ', $where);
        $sql .= ' ORDER BY submitted_at ASC';

        $rows = Database::all($sql, $sqlParams);

        if (empty($rows)) {
            Response::ok([
                'harvested' => 0,
                'results'   => [],
                'message'   => 'Nothing to harvest',
            ]);
            return;
        }

        // Mark them harvested
        $ids = array_column($rows, 'result_id');
        $placeholders = implode(',', array_fill(0, count($ids), '?'));
        Database::run(
            "UPDATE results SET harvested_at = NOW() WHERE result_id IN ($placeholders)",
            $ids
        );

        // Decode JSON blobs for the response
        foreach ($rows as &$r) {
            $r['answers']      = json_decode($r['answers_json'], true) ?: [];
            $r['exam_details'] = json_decode($r['exam_details_json'], true) ?: [];
            unset($r['answers_json'], $r['exam_details_json']);
        }

        Auth::audit(
            $tokenRow['user_phone'],
            $tokenRow['device_id'],
            'results_harvested',
            null,
            ['count' => count($rows)]
        );

        Response::ok([
            'harvested' => count($rows),
            'results'   => $rows,
        ]);
    }
}