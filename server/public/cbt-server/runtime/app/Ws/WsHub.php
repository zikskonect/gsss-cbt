<?php
// server/app/ws/WsHub.php

namespace App\Ws;

class WsHub
{
    /**
     * Path to the queue directory. Each queued message is one JSON file.
     * The WebSocket server watches this dir (via polling) and drains it.
     */
    private static function queueDir(): string
    {
        $dir = __DIR__ . '/../../runtime/ws_queue';
        if (!is_dir($dir)) {
            @mkdir($dir, 0775, true);
        }
        return $dir;
    }

    /**
     * Enqueue a message for the WebSocket server to broadcast.
     * Fire-and-forget — never blocks, never fails the REST call.
     */
    public static function broadcast(array $payload): void
    {
        try {
            $dir = self::queueDir();
            $file = $dir . '/' . microtime(true) . '_' . bin2hex(random_bytes(4)) . '.json';

            $payload['_queued_at'] = date('c');

            $tmp = $file . '.tmp';
            file_put_contents($tmp, json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES));
            @rename($tmp, $file); // atomic on same filesystem
        } catch (\Throwable $e) {
            // Never let a broadcast failure break a REST response
            error_log('[WsHub] broadcast failed: ' . $e->getMessage());
        }
    }

    /**
     * Used by the WebSocket server to drain the queue.
     * Returns an array of decoded payloads.
     */
    public static function drain(): array
    {
        $dir = self::queueDir();
        $messages = [];

        if (!is_dir($dir)) return $messages;

        $files = glob($dir . '/*.json');
        if (!$files) return $messages;

        foreach ($files as $file) {
            $raw = @file_get_contents($file);
            if ($raw !== false) {
                $decoded = json_decode($raw, true);
                if (is_array($decoded)) {
                    $messages[] = $decoded;
                }
            }
            @unlink($file);
        }

        return $messages;
    }
}