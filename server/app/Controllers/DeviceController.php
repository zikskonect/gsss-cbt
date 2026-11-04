<?php
// server/app/Controllers/DeviceController.php - FIXED for approval flow

namespace App\Controllers;

use App\Db\Database;
use App\Helpers\Auth;
use App\Helpers\Response;
use App\Helpers\Request;

class DeviceController
{
    public function register(array $params = []): void
    {
        try {
            $input = Request::json();
            $deviceId = $input['device_id'] ?? $params['device_id'] ?? uniqid('dev_');
            $platform = $input['platform'] ?? 'web';
            $userAgent = $input['user_agent'] ?? $_SERVER['HTTP_USER_AGENT'] ?? '';
            $role = $input['role_claimed'] ?? $input['role'] ?? 'unknown';

            // Check if exists
            $existing = Database::one("SELECT * FROM devices WHERE device_id = ?", [$deviceId]);

            if ($existing) {
                // Update last_seen
                Database::run("UPDATE devices SET last_seen = NOW(), platform = ?, role_claimed = ? WHERE device_id = ?", [$platform, $role, $deviceId]);
                $existing['status'] = $existing['status'] ?? 'pending';
                Response::json(['ok' => true, 'data' => $existing, 'status' => $existing['status'], 'message' => 'Device already registered']);
                return;
            }

            // New devices remain pending until an administrator approves them.
            $status = 'pending';

            Database::run(
                "INSERT INTO devices (device_id, platform, status, role_claimed) VALUES (?, ?, ?, ?)",
                [$deviceId, $platform, $status, $role]
            );

            $device = Database::one("SELECT * FROM devices WHERE device_id = ?", [$deviceId]);

            Response::json(['ok' => true, 'data' => $device, 'status' => $status]);
        } catch (\Throwable $e) {
            Response::json(['ok' => false, 'error' => $e->getMessage()], 500);
        }
    }

    public function listAll(array $params = []): void
    {
        try {
            Auth::requireAnyRole(['admin', 'exam_office']);
            $devices = Database::all("SELECT * FROM devices ORDER BY last_seen DESC");
            Response::json(['ok' => true, 'data' => $devices, 'devices' => $devices]);
        } catch (\Throwable $e) {
            Response::json(['ok' => false, 'error' => $e->getMessage()], 500);
        }
    }

    public function approve(array $params = []): void
    {
        try {
            $actor = Auth::requireAnyRole(['admin', 'exam_office']);
            $deviceId = $params['device_id'] ?? Request::json()['device_id'] ?? null;
            if (!$deviceId) {
                Response::json(['ok' => false, 'error' => 'device_id required'], 400);
                return;
            }

            Database::run("UPDATE devices SET status = 'approved', approved_at = NOW(), approved_by = ? WHERE device_id = ?", [$actor['user_phone'], $deviceId]);
            $device = Database::one("SELECT * FROM devices WHERE device_id = ?", [$deviceId]);

            Response::json(['ok' => true, 'data' => $device, 'message' => "Device $deviceId approved"]);
        } catch (\Throwable $e) {
            Response::json(['ok' => false, 'error' => $e->getMessage()], 500);
        }
    }

    public function block(array $params = []): void
    {
        try {
            $actor = Auth::requireAnyRole(['admin', 'exam_office']);
            $deviceId = $params['device_id'] ?? Request::json()['device_id'] ?? null;
            if (!$deviceId) {
                Response::json(['ok' => false, 'error' => 'device_id required'], 400);
                return;
            }

            Database::run("UPDATE devices SET status = 'blocked', blocked_at = NOW(), blocked_by = ? WHERE device_id = ?", [$actor['user_phone'], $deviceId]);
            $device = Database::one("SELECT * FROM devices WHERE device_id = ?", [$deviceId]);

            Response::json(['ok' => true, 'data' => $device, 'message' => "Device $deviceId blocked"]);
        } catch (\Throwable $e) {
            Response::json(['ok' => false, 'error' => $e->getMessage()], 500);
        }
    }

    public function delete(array $params = []): void
    {
        try {
            Auth::requireAnyRole(['admin', 'exam_office']);
            $deviceId = $params['device_id'] ?? null;
            Database::run("DELETE FROM devices WHERE device_id = ?", [$deviceId]);
            Response::json(['ok' => true, 'message' => "Device $deviceId deleted"]);
        } catch (\Throwable $e) {
            Response::json(['ok' => false, 'error' => $e->getMessage()], 500);
        }
    }

    public function heartbeat(array $params = []): void
    {
        try {
            $input = Request::json();
            $deviceId = $input['device_id'] ?? null;
            if ($deviceId) {
                Database::run("UPDATE devices SET last_seen = NOW() WHERE device_id = ?", [$deviceId]);
            }
            $device = Database::one("SELECT * FROM devices WHERE device_id = ?", [$deviceId]);
            Response::json(['ok' => true, 'data' => $device, 'status' => $device['status'] ?? 'pending']);
        } catch (\Throwable $e) {
            Response::json(['ok' => false, 'error' => $e->getMessage()], 500);
        }
    }
}
