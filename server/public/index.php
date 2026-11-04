<?php
// server/public/index.php
// ═══════════════════════════════════════════════════════════
//  Front controller. Every request lands here.
// ═══════════════════════════════════════════════════════════

declare(strict_types=1);

use App\Db\Database;
use App\Helpers\Request;
use App\Helpers\Response;

// ─── Autoload ─────────────────────────────────────────────
$composerAutoload = __DIR__ . '/../vendor/autoload.php';
if (file_exists($composerAutoload)) {
    require_once $composerAutoload;
} else {
    // Minimal PSR-4 autoload fallback so the API works even without `composer install`
    spl_autoload_register(function ($class) {
        $prefix = 'App\\';
        if (strpos($class, $prefix) !== 0) return;
        $relative = substr($class, strlen($prefix));
        $file = __DIR__ . '/../app/' . str_replace('\\', '/', $relative) . '.php';
        if (file_exists($file)) require_once $file;
    });
}

// ─── Config ───────────────────────────────────────────────
$configPath = __DIR__ . '/../app/config/config.php';
if (!file_exists($configPath)) {
    http_response_code(500);
    header('Content-Type: application/json');
    echo json_encode([
        'ok' => false,
        'error' => [
            'code' => 'config_missing',
            'message' => 'config.php is missing. Copy config.sample.php to config.php and edit it.',
        ],
    ]);
    exit;
}
$APP_CONFIG = require $configPath;
$GLOBALS['APP_CONFIG'] = $APP_CONFIG;

date_default_timezone_set($APP_CONFIG['app']['timezone'] ?? 'UTC');

// Debug display
if (!empty($APP_CONFIG['app']['debug'])) {
    ini_set('display_errors', '1');
    error_reporting(E_ALL);
} else {
    ini_set('display_errors', '0');
    error_reporting(E_ALL & ~E_DEPRECATED & ~E_NOTICE);
}

// ─── CORS ─────────────────────────────────────────────────
$corsOrigins = $APP_CONFIG['cors']['allowed_origins'] ?? ['*'];
$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
if (in_array('*', $corsOrigins, true)) {
    header('Access-Control-Allow-Origin: *');
} elseif ($origin && in_array($origin, $corsOrigins, true)) {
    header("Access-Control-Allow-Origin: $origin");
}
header('Access-Control-Allow-Methods: GET, POST, PUT, PATCH, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Device-Token, X-Device-Id');
header('Access-Control-Max-Age: 86400');

if (Request::method() === 'OPTIONS') {
    http_response_code(204);
    exit;
}

// ─── Database boot ────────────────────────────────────────
try {
    Database::boot($APP_CONFIG);
    Database::ensureAuthenticationTables();
    Database::ensureDeviceApprovalColumns();
} catch (\Throwable $e) {
    Response::serverError('Database unavailable: ' . $e->getMessage());
}

// ─── Global exception handler ─────────────────────────────
set_exception_handler(function (\Throwable $e) use ($APP_CONFIG) {
    error_log('[CBT] ' . $e->getMessage() . ' in ' . $e->getFile() . ':' . $e->getLine());
    $payload = [
        'ok' => false,
        'error' => [
            'code' => 'exception',
            'message' => $e->getMessage(),
        ],
    ];
    if (!empty($APP_CONFIG['app']['debug'])) {
        $payload['error']['file'] = $e->getFile();
        $payload['error']['line'] = $e->getLine();
        $payload['error']['trace'] = explode("\n", $e->getTraceAsString());
    }
    Response::json($payload, 500);
});

// ─── Routing ──────────────────────────────────────────────
$path   = Request::path();
$method = Request::method();

// Route table: [method, pattern, [ControllerClass, 'method']]
// Pattern segments starting with ':' are named parameters.
$routes = [
    // Health
    ['GET',  '/api/health',                          ['App\\Controllers\\HealthController', 'check']],

    // Auth
    ['POST', '/api/auth/register',                   ['App\\Controllers\\AuthController', 'register']],
    ['POST', '/api/auth/login',                      ['App\\Controllers\\AuthController', 'login']],
    ['POST', '/api/auth/logout',                     ['App\\Controllers\\AuthController', 'logout']],
    ['GET',  '/api/auth/me',                         ['App\\Controllers\\AuthController', 'me']],

    // Devices
    ['POST', '/api/devices/register',                ['App\\Controllers\\DeviceController', 'register']],
    ['POST', '/api/devices/heartbeat',               ['App\\Controllers\\DeviceController', 'heartbeat']],
    ['GET',  '/api/devices',                         ['App\\Controllers\\DeviceController', 'listAll']],
    ['POST', '/api/devices/:device_id/approve',      ['App\\Controllers\\DeviceController', 'approve']],
    ['POST', '/api/devices/:device_id/block',        ['App\\Controllers\\DeviceController', 'block']],
    ['DELETE', '/api/devices/:device_id',            ['App\\Controllers\\DeviceController', 'delete']],

    // Classes / arms / departments
    ['GET',  '/api/classes',                         ['App\\Controllers\\ClassController', 'listClasses']],
    ['POST', '/api/classes',                         ['App\\Controllers\\ClassController', 'createClass']],
    ['DELETE', '/api/classes/:class_id',             ['App\\Controllers\\ClassController', 'deleteClass']],
    ['GET',  '/api/arms',                            ['App\\Controllers\\ClassController', 'listArms']],
    ['POST', '/api/arms',                            ['App\\Controllers\\ClassController', 'createArm']],
    ['DELETE', '/api/arms/:arm_id',                  ['App\\Controllers\\ClassController', 'deleteArm']],
    ['GET',  '/api/departments',                     ['App\\Controllers\\ClassController', 'listDepartments']],
    ['POST', '/api/departments',                     ['App\\Controllers\\ClassController', 'createDepartment']],
    ['DELETE', '/api/departments/:department_id',    ['App\\Controllers\\ClassController', 'deleteDepartment']],

    // Academic years + assignments
    ['GET',  '/api/years',                           ['App\\Controllers\\AdminController', 'listYears']],
    ['POST', '/api/years',                           ['App\\Controllers\\AdminController', 'createYear']],
    ['POST', '/api/years/:year_id/start',            ['App\\Controllers\\AdminController', 'startYear']],
    ['GET',  '/api/assignments',                     ['App\\Controllers\\AdminController', 'listAssignments']],
    ['POST', '/api/assignments',                     ['App\\Controllers\\AdminController', 'createAssignment']],
    ['DELETE', '/api/assignments/:assignment_id',    ['App\\Controllers\\AdminController', 'deleteAssignment']],

    // Students
    ['GET',  '/api/students',                        ['App\\Controllers\\StudentController', 'list']],
    ['POST', '/api/students',                        ['App\\Controllers\\StudentController', 'create']],
    ['GET',  '/api/students/lookup',                 ['App\\Controllers\\StudentController', 'lookupByCode']],
    ['GET',  '/api/students/:student_id',            ['App\\Controllers\\StudentController', 'getOne']],
    ['PATCH','/api/students/:student_id',            ['App\\Controllers\\StudentController', 'update']],
    ['DELETE', '/api/students/:student_id',          ['App\\Controllers\\StudentController', 'delete']],

    // Exams
    ['GET',  '/api/exams',                           ['App\\Controllers\\ExamController', 'list']],
    ['POST', '/api/exams',                           ['App\\Controllers\\ExamController', 'create']],
    ['POST', '/api/exams/push',                      ['App\\Controllers\\ExamController', 'pushToDevices']],
    ['GET',  '/api/exams/for-device',                ['App\\Controllers\\ExamController', 'forDevice']],

        // Results
    ['POST', '/api/results',                         ['App\\Controllers\\ResultController', 'submit']],
    ['GET',  '/api/results/check',                  ['App\\Controllers\\ResultController', 'checkAttempt']],
    ['GET',  '/api/results',                         ['App\\Controllers\\ResultController', 'list']],
    ['POST', '/api/results/harvest',                 ['App\\Controllers\\ResultController', 'harvest']],
    
    // Users
    ['GET',  '/api/users/form-teachers',             ['App\\Controllers\\AuthController', 'listFormTeachers']],
    ['GET',  '/api/users',                           ['App\\Controllers\\AuthController', 'listUsers']],
    ['POST', '/api/users/pull',                      ['App\\Controllers\\AuthController', 'pull']],
    ['POST', '/api/users/:phone/:action',            ['App\\Controllers\\AuthController', 'setStatus']],
    ['DELETE', '/api/users/:phone',                  ['App\\Controllers\\AuthController', 'deleteUser']],

    // Exam Settings - Question limit & shuffle
    ['GET',  '/api/exam-settings',                   ['App\\Controllers\\ExamSettingsController', 'index']],
    ['POST', '/api/exam-settings',                   ['App\\Controllers\\ExamSettingsController', 'store']],
    ['GET',  '/api/exam-questions',                  ['App\\Controllers\\ExamSettingsController', 'getExamQuestions']],
    ['GET',  '/api/questions/count',                 ['App\\Controllers\\ExamSettingsController', 'count']],
    ['GET',  '/api/questions',                       ['App\\Controllers\\ExamController', 'listQuestions']],
];

// Match route
$matched = false;
foreach ($routes as [$routeMethod, $pattern, $handler]) {
    if ($routeMethod !== $method) continue;

    $params = matchRoute($pattern, $path);
    if ($params === null) continue;

    $matched = true;
    [$class, $methodName] = $handler;

    if (!class_exists($class)) {
        Response::serverError("Controller not found: $class");
    }

    $controller = new $class();
    if (!method_exists($controller, $methodName)) {
        Response::serverError("Action not found: $class::$methodName");
    }

    // Pass URL params as second argument
    $controller->$methodName($params);
    break;
}

// ─── Serve the Client App for non-API routes ──────────────
if (!$matched) {
    // If the request is for /api/*, we must return a JSON 404
    if (strpos($path, '/api/') === 0) {
        Response::notFound("No route matches $method $path");
    }

    // Otherwise, serve the frontend client app
    $clientPath = __DIR__ . ($path === '/' ? '/index.html' : $path);
    
        if (file_exists($clientPath) && !is_dir($clientPath)) {
        // Serve static files (JS, CSS, images)
        $ext = pathinfo($clientPath, PATHINFO_EXTENSION);
        $mimes = [
            'js' => 'application/javascript',
            'css' => 'text/css',
            'html' => 'text/html',
            'png' => 'image/png',
            'jpg' => 'image/jpeg',
            'svg' => 'image/svg+xml',
            'json' => 'application/json',
            'ico' => 'image/x-icon'
        ];
        $mime = $mimes[$ext] ?? 'application/octet-stream';
        header("Content-Type: $mime");
        readfile($clientPath);
        exit;
    }

    // If the requested file doesn't exist, fallback to index.html
    // (This allows the SPA to handle routing like /student-login)
    if (file_exists(__DIR__ . '/index.html')) {
        header('Content-Type: text/html; charset=utf-8');
        readfile(__DIR__ . '/index.html');
        exit;
    }

    // True 404 if even the index.html is missing
    Response::notFound("Client app not found.");
}

// ─── Route matcher ────────────────────────────────────────

/**
 * Match a URL pattern against a path.
 * Returns assoc array of named params, or null if no match.
 * Example: matchRoute('/api/devices/:id/approve', '/api/devices/abc/approve') => ['id' => 'abc']
 */
function matchRoute(string $pattern, string $path): ?array
{
    $patternParts = explode('/', trim($pattern, '/'));
    $pathParts    = explode('/', trim($path, '/'));

    if (count($patternParts) !== count($pathParts)) return null;

    $params = [];
    foreach ($patternParts as $i => $seg) {
        if (strpos($seg, ':') === 0) {
            $params[substr($seg, 1)] = urldecode($pathParts[$i]);
        } elseif ($seg !== $pathParts[$i]) {
            return null;
        }
    }
    return $params;
}