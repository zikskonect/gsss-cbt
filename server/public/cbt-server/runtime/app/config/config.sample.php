<?php
// server/app/config/config.sample.php
// ═══════════════════════════════════════════════════════════
//  Copy this file to config.php and edit the values.
//  NEVER commit config.php to version control.
// ═══════════════════════════════════════════════════════════

return [
    // ─── Database ─────────────────────────────────────
    'db' => [
        'host'     => '127.0.0.1',
        'port'     => 3306,
        'name'     => 'cbt_platform',
        'user'     => 'cbt_user',
        'password' => 'CHANGE_ME',
        'charset'  => 'utf8mb4',
    ],

    // ─── Application ──────────────────────────────────
    'app' => [
        'name'         => 'GSSS CBT Central Server',
        'school_code'  => 'GSS',          // matches sch_config.js schoolCode
        'env'          => 'production',   // production | development
        'debug'        => false,
        'timezone'     => 'Africa/Lagos',
    ],

    // ─── Security ─────────────────────────────────────
    'security' => [
        // Shared secret for HMAC of admin tokens. Change this.
        'app_secret' => 'CHANGE_ME_TO_A_LONG_RANDOM_STRING',

        // Token TTL in seconds (12 hours default)
        'token_ttl'  => 43200,

        // Brute-force: max login attempts per phone per 15 min
        'max_login_attempts' => 10,
        'lockout_window'     => 900,
    ],

    // ─── WebSocket (Ratchet) ──────────────────────────
    'ws' => [
        'host' => '0.0.0.0',   // listen on all interfaces
        'port' => 8081,
        'path' => '/ws',       // informational — client uses raw ws://HOST:PORT
    ],

    // ─── Client push behaviour ────────────────────────
    'push' => [
        // How long a pushed exam stays valid on a client (seconds)
        'exam_ttl' => 86400,   // 24 hours
    ],

    // ─── CORS ─────────────────────────────────────────
    // Since clients live on the same LAN and are desktop/mobile
    // apps (not browsers), CORS is mostly a safety net.
    'cors' => [
        'allowed_origins' => ['*'],
    ],
];