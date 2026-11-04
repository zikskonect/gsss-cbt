<?php
// server/app/helpers/Request.php

namespace App\Helpers;

class Request
{
    /**
     * HTTP method (uppercased).
     */
    public static function method(): string
    {
        return strtoupper($_SERVER['REQUEST_METHOD'] ?? 'GET');
    }

    /**
     * Raw path without query string, e.g. /api/devices/register
     */
    public static function path(): string
    {
        $uri = $_SERVER['REQUEST_URI'] ?? '/';
        $pos = strpos($uri, '?');
        if ($pos !== false) {
            $uri = substr($uri, 0, $pos);
        }
        return '/' . trim($uri, '/');
    }

    /**
     * Decoded JSON body as assoc array (empty array if none / invalid).
     */
    public static function json(): array
    {
        static $cached = null;
        if ($cached !== null) return $cached;

        $raw = file_get_contents('php://input');
        if ($raw === false || $raw === '') {
            $cached = [];
            return $cached;
        }

        $decoded = json_decode($raw, true);
        $cached = is_array($decoded) ? $decoded : [];
        return $cached;
    }

    /**
     * Input value: JSON body first, then form data, then query string.
     */
    public static function input(string $key, $default = null)
    {
        $json = self::json();
        if (array_key_exists($key, $json)) return $json[$key];
        if (array_key_exists($key, $_POST)) return $_POST[$key];
        if (array_key_exists($key, $_GET))  return $_GET[$key];
        return $default;
    }

    /**
     * All merged input.
     */
    public static function all(): array
    {
        return array_merge($_GET, $_POST, self::json());
    }

    /**
     * Bearer token from Authorization header, or X-Device-Token header.
     */
    public static function bearerToken(): ?string
    {
        $hdr = $_SERVER['HTTP_AUTHORIZATION']
            ?? $_SERVER['REDIRECT_HTTP_AUTHORIZATION']
            ?? '';

        if (stripos($hdr, 'Bearer ') === 0) {
            return trim(substr($hdr, 7));
        }

        if (!empty($_SERVER['HTTP_X_DEVICE_TOKEN'])) {
            return trim($_SERVER['HTTP_X_DEVICE_TOKEN']);
        }

        return null;
    }

    /**
     * Client IP address.
     */
    public static function ip(): string
    {
        return $_SERVER['REMOTE_ADDR'] ?? '0.0.0.0';
    }

    /**
     * User agent.
     */
    public static function userAgent(): string
    {
        return $_SERVER['HTTP_USER_AGENT'] ?? '';
    }
}