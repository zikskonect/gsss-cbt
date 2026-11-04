<?php
// server/app/db/Database.php

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