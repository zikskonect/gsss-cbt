<?php
// server/app/helpers/Validator.php

namespace App\Helpers;

class Validator
{
    private array $errors = [];
    private array $data;

    public function __construct(array $data)
    {
        $this->data = $data;
    }

    public function required(string $field, string $label = null): self
    {
        $label = $label ?? $field;
        $v = $this->data[$field] ?? null;
        if ($v === null || $v === '' || (is_array($v) && empty($v))) {
            $this->errors[$field] = "$label is required";
        }
        return $this;
    }

    public function string(string $field, int $min = 0, int $max = 1000): self
    {
        $v = $this->data[$field] ?? null;
        if ($v === null || $v === '') return $this;

        if (!is_string($v)) {
            $this->errors[$field] = "$field must be text";
            return $this;
        }
        $len = mb_strlen($v);
        if ($len < $min) $this->errors[$field] = "$field must be at least $min characters";
        if ($len > $max) $this->errors[$field] = "$field must be at most $max characters";
        return $this;
    }

    public function phone(string $field): self
    {
        $v = (string) ($this->data[$field] ?? '');
        if ($v === '') return $this;

        // Allow leading +, digits, dashes, spaces. Must be 7+ digits total.
        if (!preg_match('/^[0-9+\-\s]{7,20}$/', $v)) {
            $this->errors[$field] = "$field is not a valid phone number";
            return $this;
        }

        $digits = preg_replace('/\D/', '', $v);
        if (strlen($digits) < 7) {
            $this->errors[$field] = "$field has too few digits";
        }
        return $this;
    }

    public function email(string $field): self
    {
        $v = (string) ($this->data[$field] ?? '');
        if ($v === '') return $this;
        if (!filter_var($v, FILTER_VALIDATE_EMAIL)) {
            $this->errors[$field] = "$field is not a valid email";
        }
        return $this;
    }

    public function in(string $field, array $allowed): self
    {
        $v = $this->data[$field] ?? null;
        if ($v === null || $v === '') return $this;
        if (!in_array($v, $allowed, true)) {
            $this->errors[$field] = "$field must be one of: " . implode(', ', $allowed);
        }
        return $this;
    }

    public function regex(string $field, string $pattern, string $message): self
    {
        $v = (string) ($this->data[$field] ?? '');
        if ($v === '') return $this;
        if (!preg_match($pattern, $v)) {
            $this->errors[$field] = $message;
        }
        return $this;
    }

    public function int(string $field, int $min = null, int $max = null): self
    {
        $v = $this->data[$field] ?? null;
        if ($v === null || $v === '') return $this;

        if (!is_numeric($v)) {
            $this->errors[$field] = "$field must be a number";
            return $this;
        }
        $n = (int) $v;
        if ($min !== null && $n < $min) $this->errors[$field] = "$field must be >= $min";
        if ($max !== null && $n > $max) $this->errors[$field] = "$field must be <= $max";
        return $this;
    }

    public function fails(): bool
    {
        return !empty($this->errors);
    }

    public function errors(): array
    {
        return $this->errors;
    }

    public function validate(): void
    {
        if ($this->fails()) {
            Response::error('Validation failed', 'validation_error', 422, [
                'fields' => $this->errors,
            ]);
        }
    }
}