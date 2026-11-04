<?php
// server/app/Controllers/ExamSettingsController.php - FIXED for your Response class

namespace App\Controllers;

use App\Db\Database;
use App\Helpers\Response;
use App\Helpers\Request;

class ExamSettingsController {
    
    public function index(array $params = []): void {
        try {
            $pdo = Database::pdo();
            
            $stmt = $pdo->query("SELECT setting_key, setting_value FROM exam_settings");
            $rows = $stmt->fetchAll(\PDO::FETCH_KEY_PAIR);
            
            $settings = [
                'questions_per_exam' => (int)($rows['questions_per_exam'] ?? 40),
                'shuffle_questions' => (int)($rows['shuffle_questions'] ?? 1),
                'shuffle_options' => (int)($rows['shuffle_options'] ?? 1),
            ];
            
            Response::json(['ok' => true, 'data' => $settings]);
        } catch (\Throwable $e) {
            Response::json(['ok' => true, 'data' => ['questions_per_exam' => 40, 'shuffle_questions' => 1, 'shuffle_options' => 1], 'fallback' => true]);
        }
    }
    
    public function store(array $params = []): void {
        try {
            $input = Request::json();
            $pdo = Database::pdo();
            
            $allowed = ['questions_per_exam', 'shuffle_questions', 'shuffle_options'];
            
            foreach ($allowed as $key) {
                if (isset($input[$key])) {
                    $value = $input[$key];
                    $stmt = $pdo->prepare("INSERT INTO exam_settings (setting_key, setting_value, description) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value), updated_at = NOW()");
                    $desc = $key === 'questions_per_exam' ? 'Questions per exam' : 'Shuffle setting';
                    $stmt->execute([$key, $value, $desc]);
                }
            }
            
            Response::json(['ok' => true, 'message' => 'Settings saved']);
        } catch (\Throwable $e) {
            Response::json(['ok' => false, 'error' => $e->getMessage()], 500);
        }
    }
    
    // Get questions for exam with shuffling & limit
    public function getExamQuestions(array $params = []): void {
        try {
            $pdo = Database::pdo();
            
            // Get settings
            $settingsRows = Database::all("SELECT setting_key, setting_value FROM exam_settings");
            $settings = [];
            foreach ($settingsRows as $row) {
                $settings[$row['setting_key']] = $row['setting_value'];
            }
            
            $limit = (int)($settings['questions_per_exam'] ?? 40);
            $shuffleQ = (int)($settings['shuffle_questions'] ?? 1);
            $shuffleO = (int)($settings['shuffle_options'] ?? 1);
            
            // Get exam_id from query if per-exam override
            $examId = $_GET['exam_id'] ?? null;
            if ($examId) {
                try {
                    $exam = Database::one("SELECT questions_limit, shuffle_enabled FROM exams WHERE id = ?", [$examId]);
                    if ($exam && !empty($exam['questions_limit'])) {
                        $limit = (int)$exam['questions_limit'];
                    }
                    if ($exam && isset($exam['shuffle_enabled'])) {
                        $shuffleQ = (int)$exam['shuffle_enabled'];
                    }
                } catch (\Throwable $e) {}
            }
            
            // Get all questions from bank
            try {
                if ($examId) {
                    $allQuestions = Database::all("SELECT * FROM questions WHERE exam_id = ? ORDER BY id", [$examId]);
                } else {
                    $allQuestions = Database::all("SELECT * FROM questions ORDER BY id");
                }
            } catch (\Throwable $e) {
                // questions table may not exist yet
                $allQuestions = [];
            }
            
            $totalBank = count($allQuestions);
            
            if ($totalBank === 0) {
                Response::json(['ok' => true, 'data' => [], 'total_bank' => 0, 'served' => 0, 'limit_setting' => $limit]);
                return;
            }
            
            // Shuffle and limit
            if ($shuffleQ) {
                shuffle($allQuestions);
            }
            
            $served = array_slice($allQuestions, 0, min($limit, $totalBank));
            
            // Shuffle options if needed
            if ($shuffleO) {
                foreach ($served as &$q) {
                    $options = [
                        'A' => $q['option_a'] ?? $q['optionA'] ?? $q['option_1'] ?? '',
                        'B' => $q['option_b'] ?? $q['optionB'] ?? $q['option_2'] ?? '',
                        'C' => $q['option_c'] ?? $q['optionC'] ?? $q['option_3'] ?? '',
                        'D' => $q['option_d'] ?? $q['optionD'] ?? $q['option_4'] ?? '',
                    ];
                    $correct = $q['correct_option'] ?? $q['correctAnswer'] ?? $q['answer'] ?? 'A';
                    $correctText = $options[$correct] ?? $options['A'] ?? '';
                    
                    $keys = array_keys($options);
                    shuffle($keys);
                    $newOptions = [];
                    $newKeyMap = ['A', 'B', 'C', 'D'];
                    foreach ($keys as $i => $oldKey) {
                        $newKey = $newKeyMap[$i];
                        $newOptions[$newKey] = $options[$oldKey];
                        if ($options[$oldKey] === $correctText) {
                            $newCorrect = $newKey;
                        }
                    }
                    
                    $q['option_a'] = $newOptions['A'];
                    $q['option_b'] = $newOptions['B'];
                    $q['option_c'] = $newOptions['C'];
                    $q['option_d'] = $newOptions['D'];
                    $q['correct_option'] = $newCorrect ?? $correct;
                }
            }
            
            Response::json([
                'ok' => true,
                'data' => $served,
                'total_bank' => $totalBank,
                'served' => count($served),
                'limit_setting' => $limit,
                'shuffled' => $shuffleQ ? true : false
            ]);
            
        } catch (\Throwable $e) {
            Response::json(['ok' => false, 'error' => $e->getMessage()], 500);
        }
    }
    
    public function count(array $params = []): void {
        try {
            $pdo = Database::pdo();
            try {
                $count = Database::one("SELECT COUNT(*) as cnt FROM questions");
                $cnt = $count['cnt'] ?? 0;
            } catch (\Throwable $e) {
                $cnt = 0;
            }
            Response::json(['ok' => true, 'count' => (int)$cnt]);
        } catch (\Throwable $e) {
            Response::json(['ok' => false, 'count' => 0]);
        }
    }
}
