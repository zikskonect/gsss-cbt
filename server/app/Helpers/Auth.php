<?php
// server/app/helpers/Auth.php

namespace App\Helpers;

use App\Db\Database;

class Auth
{
    /**
     * Issue a new token for a user or student session.
     *
     * @param array $opts  [
     *   user_phone,    // nullable — for students omit
     *   device_id,     // nullable but recommended
     *   role,          // 'admin'|'teacher'|'form_teacher'|'exam_office'|'student'
     *   ttl,           // seconds, optional
     *   extra_claims,  // assoc array — appended to payload (not stored in DB)
     * ]
     * @return array   ['token' => '...', 'expires_at' => '...']
     */
    public static function issueToken(array $opts): array
    {
        $config = $GLOBALS['APP_CONFIG'] ?? [];
        $ttl    = $opts['ttl'] ?? ($config['security']['token_ttl'] ?? 43200);

        $token  = bin2hex(random_bytes(32));   // 64-char hex
        $now    = time();
        $expiry = $now + (int) $ttl;

        Database::insert('auth_tokens', [
            'token'       => $token,
            'user_phone'  => $opts['user_phone'] ?? null,
            'device_id'   => $opts['device_id'] ?? null,
            'role'        => $opts['role'],
            'issued_at'   => date('Y-m-d H:i:s', $now),
            'expires_at'  => date('Y-m-d H:i:s', $expiry),
        ]);

        return [
            'token'      => $token,
            'expires_at' => date('Y-m-d H:i:s', $expiry),
            'role'       => $opts['role'],
        ];
    }

    /**
     * Look up a token. Returns null if missing / expired / revoked.
     * Returns ['token','user_phone','device_id','role','expires_at'] otherwise.
     */
    public static function verifyToken(string $token): ?array
    {
        if ($token === '') return null;

        $row = Database::one(
            'SELECT token, user_phone, device_id, role, expires_at, revoked
               FROM auth_tokens
              WHERE token = ? LIMIT 1',
            [$token]
        );

        if (!$row) return null;
        if ((int) $row['revoked'] === 1) return null;
        if (strtotime($row['expires_at']) < time()) return null;

        return $row;
    }

    /**
     * Revoke a token.
     */
    public static function revokeToken(string $token): void
    {
        Database::run('UPDATE auth_tokens SET revoked = 1 WHERE token = ?', [$token]);
    }

    /**
     * Revoke all tokens for a device.
     */
    public static function revokeDeviceTokens(string $deviceId): void
    {
        Database::run('UPDATE auth_tokens SET revoked = 1 WHERE device_id = ?', [$deviceId]);
    }

    /**
     * Guard — require a valid token. Exits with 401 if not.
     * Returns the token record on success.
     */
    public static function requireToken(): array
    {
        $token = Request::bearerToken();
        if (!$token) {
            Response::unauthorized('Missing token');
        }

        $row = self::verifyToken($token);
        if (!$row) {
            Response::unauthorized('Invalid or expired token');
        }

        return $row;
    }

    /**
     * Guard — require a token with a specific role.
     */
    public static function requireRole(string $role): array
    {
        $row = self::requireToken();
        if ($row['role'] !== $role) {
            Response::forbidden("Requires role: $role");
        }
        return $row;
    }

    /**
     * Guard — require a token with one of several roles.
     */
    public static function requireAnyRole(array $roles): array
    {
        $row = self::requireToken();
        if (!in_array($row['role'], $roles, true)) {
            Response::forbidden('Insufficient role');
        }
        return $row;
    }

    /**
     * Password hash using PHP's built-in (bcrypt by default).
     */
    public static function hashPassword(string $password): string
    {
        return password_hash($password, PASSWORD_DEFAULT);
    }

    public static function verifyPassword(string $password, string $hash): bool
    {
        if (password_verify($password, $hash)) {
            return true;
        }

        // Older offline clients stored a SHA-256 digest in IndexedDB.
        return preg_match('/^[a-f0-9]{64}$/i', $hash) === 1
            && hash_equals(strtolower($hash), hash('sha256', $password));
    }

    /**
     * Brute-force guard — has this phone exceeded attempts?
     */
    public static function tooManyAttempts(string $phone, string $ip): bool
    {
        $config = $GLOBALS['APP_CONFIG'] ?? [];
        $max    = (int) ($config['security']['max_login_attempts'] ?? 10);
        $window = (int) ($config['security']['lockout_window'] ?? 900);

        $row = Database::one(
            'SELECT COUNT(*) AS c
               FROM login_attempts
              WHERE phone_number = ?
                AND success = 0
                AND attempted_at >= (NOW() - INTERVAL ? SECOND)',
            [$phone, $window]
        );

        return $row && (int) $row['c'] >= $max;
    }

    public static function recordAttempt(string $phone, string $ip, string $deviceId, bool $success): void
    {
        Database::insert('login_attempts', [
            'phone_number' => $phone,
            'ip_address'   => $ip,
            'device_id'    => $deviceId,
            'success'      => $success ? 1 : 0,
        ]);
    }

    /**
     * Audit trail.
     */
    public static function audit(?string $actorPhone, ?string $deviceId, string $action, ?string $target = null, array $details = []): void
    {
        Database::insert('audit_log', [
            'actor_phone' => $actorPhone,
            'device_id'   => $deviceId,
            'action'      => $action,
            'target'      => $target,
            'details_json'=> $details ? json_encode($details) : null,
        ]);
    }
}