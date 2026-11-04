<?php
// server/app/controllers/DeviceController.php

namespace App\Controllers;

use App\Db\Database;
use App\Helpers\Auth;
use App\Helpers\Request;
use App\Helpers\Response;
use App\Helpers\Validator;

class DeviceController
{
    /**
     * POST /api/devices/register
     * Body: { device_id, fingerprint?, hostname?, platform?, role_claimed? }
     *
     * Clients call this on every boot. If the device is unknown, it's
     * created with status 'pending'. If it exists, last_seen is bumped.
     * Server NEVER auto-approves — an admin must approve.
     */
        public function register(array $params = []): void
    {
        $input = Request::all();

        $v = new Validator($input);
        $v->required('device_id')->string('device_id', 8, 60)
          ->string('fingerprint', 0, 128)
          ->string('hostname', 0, 120)
          ->string('label', 0, 120)
          ->in('platform', ['electron', 'capacitor', 'web', 'unknown']);
        $v->validate();

        $deviceId = trim($input['device_id']);
        $ip       = Request::ip();

        $existing = Database::one(
            'SELECT * FROM devices WHERE device_id = ? LIMIT 1',
            [$deviceId]
        );

        if ($existing) {
            // Update last_seen + IP + role + label
            Database::run(
                'UPDATE devices
                    SET last_seen   = NOW(),
                        ip_address  = ?,
                        hostname    = COALESCE(?, hostname),
                        platform    = COALESCE(?, platform),
                        role_claimed= COALESCE(?, role_claimed),
                        label       = COALESCE(?, label)
                  WHERE device_id   = ?',
                [
                    $ip,
                    $input['hostname'] ?? null,
                    $input['platform'] ?? null,
                    $input['role_claimed'] ?? null,
                    $input['label'] ?? null,
                    $deviceId,
                ]
            );

            $device = Database::one('SELECT * FROM devices WHERE device_id = ? LIMIT 1', [$deviceId]);
            Response::ok([
                'device'   => $this->shapeDevice($device),
                'is_new'   => false,
            ]);
            return;
        }

        // New device
        Database::insert('devices', [
            'device_id'    => $deviceId,
            'fingerprint'  => $input['fingerprint'] ?? null,
            'hostname'     => $input['hostname'] ?? null,
            'ip_address'   => $ip,
            'platform'     => $input['platform'] ?? 'unknown',
            'role_claimed' => $input['role_claimed'] ?? null,
            'label'        => $input['label'] ?? null,
            'status'       => 'pending',
        ]);

        $device = Database::one('SELECT * FROM devices WHERE device_id = ? LIMIT 1', [$deviceId]);

        Auth::audit(null, $deviceId, 'device_registered', $input['label'] ?? 'unknown');

        Response::ok([
            'device'   => $this->shapeDevice($device),
            'is_new'   => true,
        ], 201);
    }

    /**
     * POST /api/devices/heartbeat
     * Body: { device_id }
     * Called periodically by clients (every ~30s) to keep presence fresh.
     */
    public function heartbeat(array $params = []): void
    {
        $input = Request::all();
        $deviceId = $input['device_id'] ?? null;

        if (!$deviceId) {
            Response::error('device_id required', 'validation_error', 422);
        }

        $device = Database::one('SELECT * FROM devices WHERE device_id = ? LIMIT 1', [$deviceId]);
        if (!$device) {
            Response::notFound('Device not registered');
        }

        Database::run(
            'UPDATE devices SET last_seen = NOW(), ip_address = ? WHERE device_id = ?',
            [Request::ip(), $deviceId]
        );

        Response::ok([
            'status' => $device['status'],
            'server_time' => date('c'),
        ]);
    }

    /**
     * GET /api/devices
     * Admin only. Returns all devices with online status.
     */
    public function listAll(array $params = []): void
    {
        Auth::requireRole('exam_office');

        $rows = Database::all('SELECT * FROM devices ORDER BY last_seen DESC');

        $now = time();
        $devices = array_map(function ($d) use ($now) {
            $d = $this->shapeDevice($d);
            $lastSeen = strtotime($d['last_seen'] ?? '');
            $d['online'] = $lastSeen && ($now - $lastSeen) < 120; // 2 min window
            return $d;
        }, $rows);

        Response::ok([
            'devices' => $devices,
            'count'   => count($devices),
            'online'  => count(array_filter($devices, fn($d) => $d['online'])),
        ]);
    }

    /**
     * POST /api/devices/:device_id/approve
     */
    public function approve(array $params = []): void
    {
        $tokenRow = Auth::requireRole('exam_office');
        $deviceId = $params['device_id'] ?? '';

        $device = Database::one('SELECT * FROM devices WHERE device_id = ? LIMIT 1', [$deviceId]);
        if (!$device) {
            Response::notFound('Device not found');
        }

        $label = Request::input('label');

        Database::run(
            'UPDATE devices
                SET status = "approved",
                    approved_at = NOW(),
                    approved_by = ?,
                    label = COALESCE(?, label)
              WHERE device_id = ?',
            [$tokenRow['user_phone'], $label, $deviceId]
        );

        Auth::audit($tokenRow['user_phone'], $deviceId, 'device_approved', $deviceId, [
            'label' => $label,
        ]);

        Response::ok(['device_id' => $deviceId, 'status' => 'approved']);
    }

    /**
     * POST /api/devices/:device_id/block
     */
    public function block(array $params = []): void
    {
        $tokenRow = Auth::requireRole('exam_office');
        $deviceId = $params['device_id'] ?? '';

        $device = Database::one('SELECT * FROM devices WHERE device_id = ? LIMIT 1', [$deviceId]);
        if (!$device) {
            Response::notFound('Device not found');
        }

        Database::run(
            'UPDATE devices
                SET status = "blocked",
                    blocked_at = NOW(),
                    blocked_by = ?
              WHERE device_id = ?',
            [$tokenRow['user_phone'], $deviceId]
        );

        // Revoke any tokens issued to this device
        Auth::revokeDeviceTokens($deviceId);

        Auth::audit($tokenRow['user_phone'], $deviceId, 'device_blocked', $deviceId);

        Response::ok(['device_id' => $deviceId, 'status' => 'blocked']);
    }

    /**
     * DELETE /api/devices/:device_id
     * Removes device entirely — frees it to re-register as new.
     */
    public function delete(array $params = []): void
    {
        $tokenRow = Auth::requireRole('exam_office');
        $deviceId = $params['device_id'] ?? '';

        $device = Database::one('SELECT * FROM devices WHERE device_id = ? LIMIT 1', [$deviceId]);
        if (!$device) {
            Response::notFound('Device not found');
        }

        Database::run('DELETE FROM devices WHERE device_id = ?', [$deviceId]);
        Auth::revokeDeviceTokens($deviceId);

        Auth::audit($tokenRow['user_phone'], $deviceId, 'device_deleted', $deviceId);

        Response::ok(['deleted' => true]);
    }

    /**
     * Shape a device row for the client.
     */
    private function shapeDevice(?array $d): array
    {
        if (!$d) return [];
        return [
            'device_id'    => $d['device_id'],
            'fingerprint'  => $d['fingerprint'],
            'hostname'     => $d['hostname'],
            'ip_address'   => $d['ip_address'],
            'mac_address'  => $d['mac_address'],
            'platform'     => $d['platform'],
            'role_claimed' => $d['role_claimed'],
            'status'       => $d['status'],
            'label'        => $d['label'],
            'first_seen'   => $d['first_seen'],
            'last_seen'    => $d['last_seen'],
            'approved_at'  => $d['approved_at'],
            'approved_by'  => $d['approved_by'],
            'blocked_at'   => $d['blocked_at'],
            'blocked_by'   => $d['blocked_by'],
        ];
    }
}