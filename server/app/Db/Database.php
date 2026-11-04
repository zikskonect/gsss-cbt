<?php
// server/app/Db/Database.php

namespace App\Db;

use PDO;
use PDOException;
use RuntimeException;

class Database
{
    private static ?PDO $pdo = null;
    private static ?array $config = null;

    /**
     * Boot with the app config array (usually called once from index.php).
     */
    public static function boot(array $config): void
    {
        self::$config = $config['db'] ?? null;
        if (!self::$config) {
            throw new RuntimeException('Database config missing');
        }
    }

    /**
     * Ensure the tables required by authentication exist.
     */
    public static function ensureAuthenticationTables(): void
    {
        $tables = [
            <<<'SQL'
CREATE TABLE IF NOT EXISTS users (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    phone_number VARCHAR(20) NOT NULL,
    name VARCHAR(120) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role ENUM('admin','teacher','form_teacher','exam_office') NOT NULL,
    email VARCHAR(190) DEFAULT NULL,
    school_name VARCHAR(190) DEFAULT NULL,
    is_active TINYINT(1) NOT NULL DEFAULT 1,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uniq_phone (phone_number),
    KEY idx_role (role)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
SQL,
            <<<'SQL'
CREATE TABLE IF NOT EXISTS auth_tokens (
    token VARCHAR(128) NOT NULL,
    user_phone VARCHAR(20) DEFAULT NULL,
    device_id VARCHAR(60) DEFAULT NULL,
    role VARCHAR(20) NOT NULL,
    issued_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    expires_at DATETIME NOT NULL,
    revoked TINYINT(1) NOT NULL DEFAULT 0,
    PRIMARY KEY (token),
    KEY idx_user_phone (user_phone),
    KEY idx_device (device_id),
    KEY idx_expires (expires_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
SQL,
            <<<'SQL'
CREATE TABLE IF NOT EXISTS login_attempts (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    phone_number VARCHAR(20) NOT NULL,
    ip_address VARCHAR(45) DEFAULT NULL,
    device_id VARCHAR(60) DEFAULT NULL,
    success TINYINT(1) NOT NULL DEFAULT 0,
    attempted_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY idx_phone_time (phone_number, attempted_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
SQL,
            <<<'SQL'
CREATE TABLE IF NOT EXISTS audit_log (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    actor_phone VARCHAR(20) DEFAULT NULL,
    device_id VARCHAR(60) DEFAULT NULL,
    action VARCHAR(80) NOT NULL,
    target VARCHAR(120) DEFAULT NULL,
    details_json TEXT DEFAULT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY idx_actor (actor_phone),
    KEY idx_action (action),
    KEY idx_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
SQL,
        ];

        foreach ($tables as $sql) {
            self::pdo()->exec($sql);
        }
    }

    /**
     * Add device approval columns to databases created by older releases.
     */
    public static function ensureDeviceApprovalColumns(): void
    {
        $columns = [
            'approved_at' => 'DATETIME DEFAULT NULL',
            'approved_by' => 'VARCHAR(20) DEFAULT NULL',
            'blocked_at'  => 'DATETIME DEFAULT NULL',
            'blocked_by'  => 'VARCHAR(20) DEFAULT NULL',
        ];

        foreach ($columns as $column => $definition) {
            $exists = self::one(
                'SELECT 1
                   FROM information_schema.columns
                  WHERE table_schema = DATABASE()
                    AND table_name = ?
                    AND column_name = ?
                  LIMIT 1',
                ['devices', $column]
            );

            if (!$exists) {
                self::pdo()->exec("ALTER TABLE devices ADD COLUMN `$column` $definition");
            }
        }
    }

    /**
     * Get the shared PDO instance, creating it on first call.
     */
    public static function pdo(): PDO
    {
        if (self::$pdo instanceof PDO) {
            return self::$pdo;
        }

        if (!self::$config) {
            throw new RuntimeException('Database::boot() must be called before pdo()');
        }

        $cfg = self::$config;
        $dsn = sprintf(
            'mysql:host=%s;port=%d;dbname=%s;charset=%s',
            $cfg['host'],
            $cfg['port'] ?? 3306,
            $cfg['name'],
            $cfg['charset'] ?? 'utf8mb4'
        );

        try {
            self::$pdo = new PDO($dsn, $cfg['user'], $cfg['password'], [
                PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                PDO::ATTR_EMULATE_PREPARES   => false,
                PDO::ATTR_STRINGIFY_FETCHES  => false,
            ]);
        } catch (PDOException $e) {
            throw new RuntimeException('DB connection failed: ' . $e->getMessage(), 0, $e);
        }

        return self::$pdo;
    }

    /**
     * Convenience: run a query with params and return the statement.
     */
    public static function run(string $sql, array $params = []): \PDOStatement
    {
        $stmt = self::pdo()->prepare($sql);
        $stmt->execute($params);
        return $stmt;
    }

    /**
     * Fetch a single row (or null).
     */
    public static function one(string $sql, array $params = []): ?array
    {
        $row = self::run($sql, $params)->fetch();
        return $row === false ? null : $row;
    }

    /**
     * Fetch all rows.
     */
    public static function all(string $sql, array $params = []): array
    {
        return self::run($sql, $params)->fetchAll();
    }

    /**
     * Insert a row from an assoc array, return last insert id if any.
     */
    public static function insert(string $table, array $data): string
    {
        $cols = array_keys($data);
        $placeholders = array_map(fn($c) => ':' . $c, $cols);

        $sql = sprintf(
            'INSERT INTO `%s` (%s) VALUES (%s)',
            $table,
            '`' . implode('`,`', $cols) . '`',
            implode(',', $placeholders)
        );

        $params = [];
        foreach ($data as $k => $v) {
            $params[':' . $k] = $v;
        }

        self::run($sql, $params);
        return (string) self::pdo()->lastInsertId();
    }

    /**
     * Begin/commit/rollback helpers.
     */
    public static function begin(): void    { self::pdo()->beginTransaction(); }
    public static function commit(): void   { self::pdo()->commit(); }
    public static function rollback(): void { if (self::pdo()->inTransaction()) self::pdo()->rollBack(); }
}
