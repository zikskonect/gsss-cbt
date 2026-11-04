<?php
// server/app/helpers/Response.php

namespace App\Helpers;

class Response
{
    /**
     * Send a JSON response and exit.
     */
    public static function json($data, int $status = 200): void
    {
        http_response_code($status);
        header('Content-Type: application/json; charset=utf-8');
        header('X-Content-Type-Options: nosniff');
        echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
        exit;
    }

    /**
     * Standard success shape: { ok: true, data: ... }
     */
    public static function ok($data = null, int $status = 200): void
    {
        self::json(['ok' => true, 'data' => $data], $status);
    }

    /**
     * Standard error shape: { ok: false, error: { code, message } }
     */
    public static function error(string $message, string $code = 'error', int $status = 400, array $extra = []): void
    {
        $payload = [
            'ok'    => false,
            'error' => array_merge([
                'code'    => $code,
                'message' => $message,
            ], $extra),
        ];
        self::json($payload, $status);
    }

    public static function notFound(string $message = 'Not found'): void
    {
        self::error($message, 'not_found', 404);
    }

    public static function unauthorized(string $message = 'Unauthorized'): void
    {
        self::error($message, 'unauthorized', 401);
    }

    public static function forbidden(string $message = 'Forbidden'): void
    {
        self::error($message, 'forbidden', 403);
    }

    public static function serverError(string $message = 'Server error'): void
    {
        self::error($message, 'server_error', 500);
    }
}