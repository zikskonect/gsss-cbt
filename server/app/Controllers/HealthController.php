<?php
// server/app/controllers/HealthController.php - FIXED with exam_settings

namespace App\Controllers;

use App\Db\Database;
use App\Helpers\Response;

class HealthController
{
    /**
     * GET /api/health
     * Liveness check + DB reachability + schema version.
     */
    public function check(array $params = []): void
    {
        $checks = [
            'php_version' => PHP_VERSION,
            'db'          => false,
            'schema_ok'   => false,
            'server_time' => date('c'),
        ];

        try {
            $row = Database::one('SELECT 1 AS ok');
            $checks['db'] = $row && (int) $row['ok'] === 1;
        } catch (\Throwable $e) {
            $checks['db_error'] = $e->getMessage();
        }

        if ($checks['db']) {
            try {
                // Verify critical tables exist - FIXED list (removed auth_tokens, added exam_settings + questions if exists)
                $tables = Database::all("
                    SELECT table_name AS name
                      FROM information_schema.tables
                     WHERE table_schema = DATABASE()
                       AND table_name IN (
                           'users','students','devices','exams','results',
                           'academic_years','classes','arms','departments',
                           'form_teacher_assignments','exam_settings','questions'
                       )
                ");
                $checks['schema_tables_found'] = count($tables);
                // At least 10 core tables, exam_settings is optional for backward compat
                $checks['schema_ok'] = count($tables) >= 10;
                $checks['expected_tables'] = 11;
                $checks['found_tables'] = array_column($tables, 'name');
            } catch (\Throwable $e) {
                $checks['schema_error'] = $e->getMessage();
            }
        }

        $config = $GLOBALS['APP_CONFIG'] ?? [];
        $checks['app_name']    = $config['app']['name']    ?? null;
        $checks['school_code'] = $config['app']['school_code'] ?? null;
        $checks['env']         = $config['app']['env']     ?? null;

        $healthy = $checks['db'] && $checks['schema_ok'];

        Response::json([
            'ok'      => $healthy,
            'status'  => $healthy ? 'healthy' : 'degraded',
            'checks'  => $checks,
        ], $healthy ? 200 : 503);
    }
}
