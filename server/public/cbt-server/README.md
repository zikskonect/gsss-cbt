# GSS Gwags CBT - One Click Server

### For Non-Technical Teachers - How to Run

1. **Install**
   - Double-click `GSS-Gwags-CBT-Setup.exe` from `dist/desktop/`
   - Install to `C:\GSS-CBT` (default)
   - Desktop shortcut created

2. **First Time Setup (one time)**
   - Download portable PHP 8.2 NTS: https://windows.php.net/downloads/releases/php-8.2-nts-Win32-vs16-x64.zip
   - Extract to `runtime/php/` so you have `runtime/php/php.exe`
   - Download portable MariaDB: https://downloads.mariadb.org/ - ZIP - extract to `runtime/mariadb/` so you have `runtime/mariadb/bin/mysqld.exe`
   - Copy your `server/public/` folder contents to `runtime/webroot/`
   - Copy your `server/app/` folder to `runtime/app/` (or runtime/webroot/app/)

   OR use included provisioner - it will tell you what's missing.

3. **Daily Use (Teacher)**
   - Double-click desktop icon "GSS Gwags CBT Server"
   - Click ▶ START SERVER (one button!)
   - Wait 10 seconds - status becomes 🟢 RUNNING
   - Share URL `http://192.168.1.176:8000` or QR code to students
   - Students open URL on their phones/PCs - same WiFi
   - Click 🌐 Open in Browser to manage exams
   - When exam done, click ■ STOP SERVER

4. **How it solves central DB problem**
   - Before: Each browser had its own IndexedDB -> teachers invisible to admin
   - Now: All devices connect to main PC's MariaDB `cbt_platform` (port 3307) -> central, admin sees everyone

5. **Build EXE**
   ```bash
   npm install
   npm start          # test
   npm run build      # builds EXE to ../dist/desktop/
   ```

6. **Firewall**
   Run as Admin once:
   ```bat
   netsh advfirewall firewall add rule name="CBT 8000" dir=in action=allow protocol=TCP localport=8000
   netsh advfirewall firewall add rule name="CBT 8081" dir=in action=allow protocol=TCP localport=8081
   ```

7. **Backup**
   Click 💾 Backup Database -> saves to %APPDATA%\GSSS-CBT\backups\