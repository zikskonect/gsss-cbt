<?php
// server/ws-server.php - FIXED for one-click portable runtime
// ════════════════════════════════════════════════════════════════════
//  Fixes:
//  - Works with runtime/php/ and runtime/mariadb/ portable layout
//  - Auto-finds config.php in multiple locations
//  - Handles port 3307 (one-click) vs 3306 (Laragon)
//  - Creates ws_queue dir if missing
// ════════════════════════════════════════════════════════════════════

// Composer autoload - check multiple locations
$autoloadPaths = [
    __DIR__ . '/vendor/autoload.php',
    __DIR__ . '/../vendor/autoload.php',
    __DIR__ . '/../../vendor/autoload.php',
    __DIR__ . '/../app/vendor/autoload.php',
];

$found = false;
foreach ($autoloadPaths as $path) {
    if (file_exists($path)) {
        require $path;
        $found = true;
        break;
    }
}

if (!$found) {
    // Fallback PSR-4 autoload for portable runtime without composer
    spl_autoload_register(function ($class) {
        $prefix = 'App\\';
        if (strpos($class, $prefix) !== 0) return;
        $relative = substr($class, strlen($prefix));
        $bases = [
            __DIR__ . '/app/',
            __DIR__ . '/../app/',
            __DIR__ . '/../../app/',
            __DIR__ . '/runtime/webroot/../app/',
            __DIR__ . '/runtime/app/',
        ];
        foreach ($bases as $base) {
            $file = $base . str_replace('\\', '/', $relative) . '.php';
            if (file_exists($file)) {
                require_once $file;
                return;
            }
        }
    });
}

use Ratchet\Http\HttpServer;
use Ratchet\Server\IoServer;
use Ratchet\WebSocket\WsServer;
use React\EventLoop\Factory as LoopFactory;
use React\Socket\SocketServer;

use App\Db\Database;
use App\Ws\PresenceServer;

// ─── Load config - check multiple locations for one-click layout ────────
$configPaths = [
    __DIR__ . '/app/config/config.php',                    // server/app/config/
    __DIR__ . '/../app/config/config.php',                 // runtime/webroot/../app/
    __DIR__ . '/runtime/app/config/config.php',            // cbt-server/runtime/app/
    __DIR__ . '/runtime/webroot/app/config/config.php',    // cbt-server/runtime/webroot/app/
    __DIR__ . '/../runtime/app/config/config.php',         // cbt-server/runtime/app/
    __DIR__ . '/../../app/config/config.php',
];

$configPath = null;
foreach ($configPaths as $p) {
    if (file_exists($p)) {
        $configPath = $p;
        break;
    }
}

if (!$configPath) {
    fwrite(STDERR, "❌ config.php not found. Searched:\n");
    foreach ($configPaths as $p) fwrite(STDERR, "  - $p\n");
    fwrite(STDERR, "Copy config.sample.php → config.php or let one-click server generate it.\n");
    exit(1);
}

$config = require $configPath;
$GLOBALS['APP_CONFIG'] = $config;

date_default_timezone_set($config['app']['timezone'] ?? 'Africa/Lagos');

// ─── Ensure ws_queue dir exists ──────────────────────────────────────────
$queueDirs = [
    __DIR__ . '/runtime/ws_queue',
    __DIR__ . '/../runtime/ws_queue',
    __DIR__ . '/../../runtime/ws_queue',
    sys_get_temp_dir() . '/gss-cbt-ws-queue',
];

foreach ($queueDirs as $dir) {
    if (!is_dir($dir)) {
        @mkdir($dir, 0777, true);
    }
}

// ─── Boot DB ─────────────────────────────────────────────────────────────
try {
    Database::boot($config);
    fwrite(STDOUT, "✅ DB connected: {$config['db']['name']} @ {$config['db']['host']}:{$config['db']['port']}\n");
} catch (\Throwable $e) {
    fwrite(STDERR, "❌ DB boot failed: {$e->getMessage()}\n");
    fwrite(STDERR, "   Check config.php DB port - one-click uses 3307, Laragon uses 3306\n");
    // Don't exit - WS can run without DB for presence, but log error
    // exit(1);
}

// ─── Event loop ──────────────────────────────────────────────────────────
$loop = LoopFactory::create();

$host = $config['ws']['host'] ?? '0.0.0.0';
$port = (int) ($config['ws']['port'] ?? 8081);

// ─── Presence handler ────────────────────────────────────────────────────
$presence = new PresenceServer();

// ─── Socket server ───────────────────────────────────────────────────────
try {
    $socket = new SocketServer("$host:$port", [], $loop);
} catch (\Throwable $e) {
    fwrite(STDERR, "❌ Cannot bind to $host:$port - port already in use?\n");
    fwrite(STDERR, "   Error: {$e->getMessage()}\n");
    exit(1);
}

$wsServer = new IoServer(
    new HttpServer(
        new WsServer($presence)
    ),
    $socket,
    $loop
);

// ─── Timer: drain REST → WS queue + heartbeat ────────────────────────────
$loop->addPeriodicTimer(1.0, function () use ($presence) {
    try {
        $presence->tick();
    } catch (\Throwable $e) {
        fwrite(STDERR, "[WS tick] " . $e->getMessage() . "\n");
    }
});

// ─── Startup banner ──────────────────────────────────────────────────────
$ip = gethostbyname(gethostname() ?: 'localhost');
echo "╔════════════════════════════════════════════════════╗\n";
echo "║  GSS CBT — WebSocket Presence Server (FIXED)    ║\n";
echo "╚════════════════════════════════════════════════════╝\n";
echo "  Listening:      ws://$host:$port\n";
echo "  LAN clients:    ws://$ip:$port\n";
echo "  DB:             {$config['db']['name']} @ {$config['db']['host']}:{$config['db']['port']}\n";
echo "  Config:         $configPath\n";
echo "  Queue dir:      " . realpath(__DIR__ . '/runtime/ws_queue') . "\n";
echo "  Stop with:      Ctrl+C\n";
echo "\n✅ WebSocket server ready - status should turn green now!\n\n";

$loop->run();