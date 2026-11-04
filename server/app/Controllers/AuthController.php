<?php

namespace App\Controllers;

use App\Db\Database;
use App\Helpers\Auth;
use App\Helpers\Request;
use App\Helpers\Response;
use App\Helpers\Validator;

class AuthController
{
    private const REGISTERED_ROLES = ['teacher', 'form_teacher', 'exam_office'];
    private const LOGIN_ROLES = ['admin', 'teacher', 'form_teacher', 'exam_office'];

    public function register(array $params = []): void
    {
        $input = Request::all();
        $validator = new Validator($input);
        $validator->required('role')->in('role', self::REGISTERED_ROLES)
            ->required('name')->string('name', 2, 120)
            ->required('phone_number')->phone('phone_number')
            ->required('password')->string('password', 6, 100)
            ->email('email');
        $validator->validate();

        $role = trim((string) $input['role']);
        $phone = trim((string) $input['phone_number']);
        $name = trim((string) $input['name']);
        $email = isset($input['email']) ? trim((string) $input['email']) : null;
        $schoolName = isset($input['school_name']) ? trim((string) $input['school_name']) : null;

        if ($role === 'exam_office' && (!$email || !$schoolName)) {
            Response::error('Email and school name are required for exam office', 'validation_error', 422);
        }
        if ($role !== 'exam_office') {
            $email = null;
            $schoolName = null;
        }

        if (Database::one('SELECT id FROM users WHERE phone_number = ? LIMIT 1', [$phone])) {
            Response::error('Phone number already registered', 'duplicate_phone', 409);
        }

        $deviceId = Request::input('device_id');
        Database::insert('users', [
            'phone_number' => $phone,
            'name' => $name,
            'password_hash' => Auth::hashPassword((string) $input['password']),
            'role' => $role,
            'email' => $email,
            'school_name' => $schoolName,
            'is_active' => 1,
        ]);

        Auth::audit($phone, $deviceId, 'register', $role);
        Response::ok(['role' => $role, 'phone' => $phone], 201);
    }

    public function login(array $params = []): void
    {
        $input = Request::all();
        $validator = new Validator($input);
        $validator->required('phone_number')->phone('phone_number')
            ->required('password')->string('password', 1, 100)
            ->in('role', self::LOGIN_ROLES);
        $validator->validate();

        $phone = trim((string) $input['phone_number']);
        $password = (string) $input['password'];
        $requestedRole = isset($input['role']) ? trim((string) $input['role']) : null;
        $deviceId = $input['device_id'] ?? null;
        $ip = Request::ip();

        if (Auth::tooManyAttempts($phone, $ip)) {
            Auth::recordAttempt($phone, $ip, (string) ($deviceId ?? ''), false);
            Response::error('Too many failed attempts. Try again later.', 'rate_limited', 429);
        }

        $user = Database::one('SELECT * FROM users WHERE phone_number = ? LIMIT 1', [$phone]);
        if (!$user || !Auth::verifyPassword($password, (string) $user['password_hash'])) {
            Auth::recordAttempt($phone, $ip, (string) ($deviceId ?? ''), false);
            Response::error('Invalid credentials', 'invalid_credentials', 401);
        }
        if ((int) $user['is_active'] !== 1) {
            Response::error('Account disabled', 'account_disabled', 403);
        }

        $teacherLogin = $requestedRole === 'teacher' && $user['role'] === 'form_teacher';
        if ($requestedRole !== null && $user['role'] !== $requestedRole && !$teacherLogin) {
            Response::error('Role mismatch for this account', 'role_mismatch', 403);
        }

        $role = $user['role'];
        Auth::recordAttempt($phone, $ip, (string) ($deviceId ?? ''), true);
        $token = Auth::issueToken([
            'user_phone' => $phone,
            'device_id' => $deviceId,
            'role' => $role,
        ]);

        if ($deviceId) {
            Database::run(
                'UPDATE devices SET role_claimed = ?, last_seen = NOW() WHERE device_id = ?',
                [$role, $deviceId]
            );
        }

        Auth::audit($phone, $deviceId, 'login', $role);
        Response::ok([
            'token' => $token['token'],
            'expires_at' => $token['expires_at'],
            'role' => $role,
            'user' => $this->publicUser($user),
        ]);
    }

    public function logout(array $params = []): void
    {
        $token = Request::bearerToken();
        if ($token) {
            $row = Auth::verifyToken($token);
            Auth::revokeToken($token);
            if ($row) {
                Auth::audit($row['user_phone'] ?? null, $row['device_id'] ?? null, 'logout', $row['role']);
            }
        }
        Response::ok(['message' => 'Logged out']);
    }

    public function me(array $params = []): void
    {
        $tokenRow = Auth::requireToken();
        $payload = [
            'role' => $tokenRow['role'],
            'device_id' => $tokenRow['device_id'],
            'expires_at' => $tokenRow['expires_at'],
        ];

        if ($tokenRow['user_phone']) {
            $user = Database::one(
                'SELECT name, phone_number, role, email, school_name, is_active
                   FROM users WHERE phone_number = ? LIMIT 1',
                [$tokenRow['user_phone']]
            );
            if (!$user) Response::unauthorized('User no longer exists');
            if ((int) $user['is_active'] !== 1) Response::forbidden('Account disabled');
            $payload['user'] = $user;
        }
        Response::ok($payload);
    }

    public function listFormTeachers(array $params = []): void
    {
        Auth::requireAnyRole(['admin', 'exam_office']);
        Response::ok([
            'teachers' => Database::all(
                'SELECT name, phone_number FROM users WHERE role = "form_teacher" AND is_active = 1 ORDER BY name ASC'
            ),
        ]);
    }

    public function listUsers(array $params = []): void
    {
        Auth::requireAnyRole(['admin', 'exam_office']);
        $users = Database::all(
            'SELECT id, phone_number, name, role, email, school_name, is_active, created_at, updated_at
               FROM users ORDER BY created_at DESC'
        );
        Response::ok($users);
    }

    public function pull(array $params = []): void
    {
        $actor = Auth::requireAnyRole(['admin', 'exam_office']);
        $input = Request::all();
        $validator = new Validator($input);
        $validator->required('phone_number')->phone('phone_number')
            ->required('name')->string('name', 2, 120)
            ->required('role')->in('role', self::REGISTERED_ROLES)
            ->required('password')->string('password', 6, 255);
        $validator->validate();

        $phone = trim((string) $input['phone_number']);
        $existing = Database::one('SELECT id FROM users WHERE phone_number = ? LIMIT 1', [$phone]);
        if ($existing) Response::error('Phone number already registered', 'duplicate_phone', 409);

        $password = (string) $input['password'];
        $passwordHash = (strpos($password, '$2y$') === 0 || preg_match('/^[a-f0-9]{64}$/i', $password) === 1)
            ? $password
            : Auth::hashPassword($password);
        Database::insert('users', [
            'phone_number' => $phone,
            'name' => trim((string) $input['name']),
            'password_hash' => $passwordHash,
            'role' => $input['role'],
            'email' => $input['email'] ?? null,
            'school_name' => $input['school_name'] ?? null,
            'is_active' => 1,
        ]);
        Auth::audit($actor['user_phone'], $input['device_id'] ?? null, 'user_pulled', $phone);
        Response::ok(['user' => Database::one('SELECT id, phone_number, name, role, email, school_name, is_active, created_at FROM users WHERE phone_number = ?', [$phone])], 201);
    }

    public function setStatus(array $params = []): void
    {
        $actor = Auth::requireAnyRole(['admin', 'exam_office']);
        $phone = $params['phone'] ?? '';
        $active = ($params['action'] ?? '') === 'unblock' ? 1 : 0;
        if (!$phone || !in_array($params['action'] ?? '', ['block', 'unblock'], true)) {
            Response::error('Valid phone and action are required', 'validation_error', 422);
        }
        Database::run('UPDATE users SET is_active = ? WHERE phone_number = ?', [$active, $phone]);
        Auth::audit($actor['user_phone'], null, $active ? 'user_unblocked' : 'user_blocked', $phone);
        Response::ok(['phone_number' => $phone, 'is_active' => $active]);
    }

    public function deleteUser(array $params = []): void
    {
        $actor = Auth::requireAnyRole(['admin', 'exam_office']);
        $phone = $params['phone'] ?? '';
        if (!$phone) Response::error('Phone is required', 'validation_error', 422);
        Database::run('DELETE FROM users WHERE phone_number = ?', [$phone]);
        Auth::audit($actor['user_phone'], null, 'user_deleted', $phone);
        Response::ok(['phone_number' => $phone]);
    }

    private function publicUser(array $user): array
    {
        return [
            'name' => $user['name'],
            'phone_number' => $user['phone_number'],
            'role' => $user['role'],
            'email' => $user['email'],
            'school_name' => $user['school_name'],
        ];
    }
}
