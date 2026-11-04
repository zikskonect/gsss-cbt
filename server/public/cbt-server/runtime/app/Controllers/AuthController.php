<?php
// server/app/controllers/AuthController.php

namespace App\Controllers;

use App\Db\Database;
use App\Helpers\Auth;
use App\Helpers\Request;
use App\Helpers\Response;
use App\Helpers\Validator;

class AuthController
{
    /**
     * POST /api/auth/register
     * Body: { role, name, phone_number, password, email?, school_name? }
     * Allowed roles: teacher, form_teacher, exam_office
     * (Admin accounts are seeded during install or created manually in DB.)
     */
    public function register(array $params = []): void
    {
        $input = Request::all();

        $v = new Validator($input);
        $v->required('role')
          ->in('role', ['teacher', 'form_teacher', 'exam_office'])
          ->required('name')->string('name', 2, 120)
          ->required('phone_number')->phone('phone_number')
          ->required('password')->string('password', 6, 100)
          ->email('email');
        $v->validate();

        $role        = $input['role'];
        $name        = trim($input['name']);
        $phone       = trim($input['phone_number']);
        $password    = $input['password'];
        $email       = isset($input['email']) ? trim($input['email']) : null;
        $schoolName  = isset($input['school_name']) ? trim($input['school_name']) : null;

        // Enforce email/school only for exam_office
        if ($role === 'exam_office') {
            if (!$email) {
                Response::error('Email is required for exam office', 'validation_error', 422);
            }
            if (!$schoolName) {
                Response::error('School name is required for exam office', 'validation_error', 422);
            }
        } else {
            $email = null;
            $schoolName = null;
        }

        // Duplicate phone check
        $existing = Database::one(
            'SELECT id FROM users WHERE phone_number = ? LIMIT 1',
            [$phone]
        );
        if ($existing) {
            Response::error('Phone number already registered', 'duplicate_phone', 409);
        }

        $hash = Auth::hashPassword($password);

        Database::insert('users', [
            'phone_number'  => $phone,
            'name'          => $name,
            'password_hash' => $hash,
            'role'          => $role,
            'email'         => $email,
            'school_name'   => $schoolName,
            'is_active'     => 1,
        ]);

        $deviceId = Request::input('device_id');
        Auth::audit($phone, $deviceId, 'register', $role);

        Response::ok([
            'role'  => $role,
            'phone' => $phone,
        ], 201);
    }

    /**
     * POST /api/auth/login
     * Body: { role, phone_number, password, device_id? }
     * Returns: { token, expires_at, role, user }
     */
    public function login(array $params = []): void
    {
        $input = Request::all();

        $v = new Validator($input);
        $v->required('role')->in('role', ['admin', 'teacher', 'form_teacher', 'exam_office'])
          ->required('phone_number')->phone('phone_number')
          ->required('password')->string('password', 1, 100);
        $v->validate();

        $role     = $input['role'];
        $phone    = trim($input['phone_number']);
        $password = $input['password'];
        $deviceId = $input['device_id'] ?? null;
        $ip       = Request::ip();

        // Brute-force guard
        if (Auth::tooManyAttempts($phone, $ip)) {
            Auth::recordAttempt($phone, $ip, $deviceId ?? '', false);
            Response::error(
                'Too many failed attempts. Try again later.',
                'rate_limited',
                429
            );
        }

        $user = Database::one(
            'SELECT * FROM users WHERE phone_number = ? LIMIT 1',
            [$phone]
        );

        if (!$user || !Auth::verifyPassword($password, $user['password_hash'])) {
            Auth::recordAttempt($phone, $ip, $deviceId ?? '', false);
            Response::error('Invalid credentials', 'invalid_credentials', 401);
        }

        if ((int) $user['is_active'] !== 1) {
            Auth::recordAttempt($phone, $ip, $deviceId ?? '', false);
            Response::error('Account disabled', 'account_disabled', 403);
        }

     // Allow 'teacher' login to authenticate a 'form_teacher' account
        $isTeacherLogin = ($role === 'teacher' && $user['role'] === 'form_teacher');
        
        if ($user['role'] !== $role && !$isTeacherLogin) {
            Auth::recordAttempt($phone, $ip, $deviceId ?? '', false);
            Response::error('Role mismatch for this account', 'role_mismatch', 403);
        }

        Auth::recordAttempt($phone, $ip, $deviceId ?? '', true);

        // Issue token
        $tokenData = Auth::issueToken([
            'user_phone' => $phone,
            'device_id'  => $deviceId,
            'role'       => $role,
        ]);

        // Update device record if provided
        if ($deviceId) {
            Database::run(
                'UPDATE devices SET role_claimed = ?, last_seen = NOW() WHERE device_id = ?',
                [$role, $deviceId]
            );
        }

        Auth::audit($phone, $deviceId, 'login', $role);

        Response::ok([
            'token'      => $tokenData['token'],
            'expires_at' => $tokenData['expires_at'],
            'role'       => $role,
            'user'       => [
                'name'         => $user['name'],
                'phone_number' => $user['phone_number'],
                'role'         => $user['role'],
                'email'        => $user['email'],
                'school_name'  => $user['school_name'],
            ],
        ]);
    }

    /**
     * POST /api/auth/logout
     * Header: Authorization: Bearer <token>
     */
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

    /**
     * GET /api/auth/me
     * Header: Authorization: Bearer <token>
     */
    public function me(array $params = []): void
    {
        $tokenRow = Auth::requireToken();

        $payload = [
            'role'      => $tokenRow['role'],
            'device_id' => $tokenRow['device_id'],
            'expires_at'=> $tokenRow['expires_at'],
        ];

        if ($tokenRow['user_phone']) {
            $user = Database::one(
                'SELECT name, phone_number, role, email, school_name, is_active
                   FROM users WHERE phone_number = ? LIMIT 1',
                [$tokenRow['user_phone']]
            );
            if (!$user) {
                Response::unauthorized('User no longer exists');
            }
            if ((int) $user['is_active'] !== 1) {
                Response::forbidden('Account disabled');
            }
            $payload['user'] = $user;
        }

        Response::ok($payload);
    }

    /**
     * GET /api/users/form-teachers
     * Returns a list of all registered form teachers (used for the assignment dropdown).
     */
    public function listFormTeachers(array $params = []): void
    {
        Auth::requireRole('exam_office');

        $rows = Database::all(
            'SELECT name, phone_number FROM users WHERE role = "form_teacher" ORDER BY name ASC'
        );

        Response::ok(['teachers' => $rows]);
    }
}