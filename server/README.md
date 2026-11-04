# GSS CBT — Central Server

PHP + MariaDB central server for the CBT platform. Serves the REST API,
the WebSocket presence channel, and (optionally) the client static files.

## Requirements

- PHP 8.0+
- MariaDB 10.3+ or MySQL 5.7+
- Composer (for WebSocket support via Ratchet)

## Install (first time)

1. Copy `app/config/config.sample.php` → `app/config/config.php` and edit:
   - DB host / name / user / password
   - `app_secret` — long random string
   - `school_code` — must match `sch_config.js` `schoolCode`

2. Point your web server's document root at `server/public/`.

   **Apache** (already has `.htaccess`) — just enable `mod_rewrite`.

   **Nginx** example:
   ```nginx
   server {
       listen 80;
       server_name _;
       root /path/to/cbt-platform/server/public;
       index index.php;

       location / {
           try_files $uri $uri/ /index.php?$query_string;
       }
       location ~ \.php$ {
           fastcgi_pass unix:/run/php/php8.1-fpm.sock;
           include fastcgi_params;
           fastcgi_param SCRIPT_FILENAME $document_root$fastcgi_script_name;
       }
   }