<?php
// server/app/ws/PresenceServer.php

namespace App\Ws;

use Ratchet\MessageComponentInterface;
use Ratchet\ConnectionInterface;
use App\Db\Database;

class PresenceServer implements MessageComponentInterface
{
    /**
     * SplObjectStorage of ConnectionInterface => metadata
     * metadata: [ device_id, role, connected_at ]
     */
    protected \SplObjectStorage $clients;

    /**
     * device_id => ConnectionInterface  (for targeted sends)
     */
    protected array $byDevice = [];

    /**
     * Counter for polling the queue.
     */
    protected int $tick = 0;

    public function __construct()
    {
        $this->clients = new \SplObjectStorage();
        echo "[WS] Presence server started\n";
    }

    public function onOpen(ConnectionInterface $conn): void
    {
        $this->clients->attach($conn, [
            'device_id'    => null,
            'role'         => null,
            'connected_at' => time(),
        ]);

        // Send a hello so the client knows it's connected
        $conn->send(json_encode([
            'type'         => 'welcome',
            'server_time'  => date('c'),
            'message'      => 'Connected to CBT presence server',
        ]));

        echo "[WS] Connection opened: {$conn->resourceId}\n";
    }

    public function onMessage(ConnectionInterface $from, $msg): void
    {
        $meta = $this->clients[$from];
        $data = json_decode($msg, true);
        if (!is_array($data)) return;

        $type = $data['type'] ?? null;

        switch ($type) {
            case 'hello':
                $deviceId = $data['device_id'] ?? null;
                if (!$deviceId) return;

                $meta['device_id'] = $deviceId;
                $meta['role']      = $data['role'] ?? null;
                $this->clients[$from] = $meta;
                $this->byDevice[$deviceId] = $from;

                // Update last_seen in DB
                try {
                    Database::run(
                        'UPDATE devices SET last_seen = NOW(), ip_address = ? WHERE device_id = ?',
                        [$from->remoteAddress ?? null, $deviceId]
                    );
                } catch (\Throwable $e) {
                    // Ignore
                }

                // Acknowledge
                $from->send(json_encode([
                    'type'      => 'hello.ack',
                    'device_id' => $deviceId,
                ]));

                // Tell everyone else this device is online
                $this->broadcastExcept($from, [
                    'type'      => 'device.online',
                    'device_id' => $deviceId,
                    'role'      => $meta['role'],
                ]);

                echo "[WS] Device registered: {$deviceId} ({$meta['role']})\n";
                break;

            case 'ping':
                $from->send(json_encode([
                    'type' => 'pong',
                    't'    => $data['t'] ?? time(),
                ]));

                // Bump last_seen
                if ($meta['device_id']) {
                    try {
                        Database::run(
                            'UPDATE devices SET last_seen = NOW() WHERE device_id = ?',
                            [$meta['device_id']]
                        );
                    } catch (\Throwable $e) { /* ignore */ }
                }
                break;

            case 'subscribe':
                // Reserved: clients can subscribe to specific topics
                $from->send(json_encode([
                    'type'    => 'subscribed',
                    'topics'  => $data['topics'] ?? [],
                ]));
                break;

            default:
                // Ignore unknown types
                break;
        }
    }

    public function onClose(ConnectionInterface $conn): void
    {
        $meta = $this->clients[$conn] ?? null;

        if ($meta && $meta['device_id']) {
            unset($this->byDevice[$meta['device_id']]);

            // Broadcast offline
            $this->broadcastExcept($conn, [
                'type'      => 'device.offline',
                'device_id' => $meta['device_id'],
            ]);

            echo "[WS] Device disconnected: {$meta['device_id']}\n";
        }

        $this->clients->detach($conn);
    }

    public function onError(ConnectionInterface $conn, \Exception $e): void
    {
        echo "[WS] Error: " . $e->getMessage() . "\n";
        $conn->close();
    }

    /**
     * Called by the periodic timer to drain the REST queue and broadcast.
     * (See ws-server.php for how the timer is wired.)
     */
    public function tick(): void
    {
        $this->tick++;

        // Drain the queue
        $messages = WsHub::drain();
        foreach ($messages as $msg) {
            $this->broadcastAll($msg);
        }

        // Periodic heartbeat to all clients (every ~30 ticks = 30s)
        if ($this->tick % 30 === 0) {
            $this->broadcastAll([
                'type'        => 'server.heartbeat',
                'server_time' => date('c'),
                'client_count'=> count($this->clients),
            ]);
        }
    }

    /**
     * Send a message to every connected client.
     */
    public function broadcastAll(array $payload): void
    {
        $json = json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
        foreach ($this->clients as $client) {
            try {
                $client->send($json);
            } catch (\Throwable $e) {
                // Ignore send failures — client is probably gone
            }
        }
    }

    /**
     * Send to every client except $except.
     */
    public function broadcastExcept(ConnectionInterface $except, array $payload): void
    {
        $json = json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
        foreach ($this->clients as $client) {
            if ($client === $except) continue;
            try {
                $client->send($json);
            } catch (\Throwable $e) { /* ignore */ }
        }
    }

    /**
     * Send to a specific device_id.
     */
    public function sendToDevice(string $deviceId, array $payload): bool
    {
        if (!isset($this->byDevice[$deviceId])) return false;
        $conn = $this->byDevice[$deviceId];
        try {
            $conn->send(json_encode($payload, JSON_UNESCAPED_UNICODE));
            return true;
        } catch (\Throwable $e) {
            return false;
        }
    }

    public function getClientCount(): int
    {
        return count($this->clients);
    }
}