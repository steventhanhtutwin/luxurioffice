# Innocreation ERP — Login / Phase 1

Stack: Node.js, Express, EJS, MySQL. Local development starter; no public registration or default password.

## 1. Requirements

Install Node.js LTS (22 or newer), VS Code, MySQL Server and Workbench.
Open the extracted `innocreation-erp` folder in VS Code. Open Terminal → New Terminal.

## 2. Create database in MySQL Workbench

Connect using your MySQL administrator account. Open a SQL tab, change the sample password below to your own password, then execute:

```sql
CREATE DATABASE IF NOT EXISTS innocreation_erp
  CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'innocreation_app'@'127.0.0.1'
  IDENTIFIED BY 'REPLACE_WITH_YOUR_OWN_STRONG_DB_PASSWORD';
GRANT SELECT, INSERT, UPDATE, DELETE, CREATE, INDEX
  ON innocreation_erp.* TO 'innocreation_app'@'127.0.0.1';
```

The app connects by TCP to 127.0.0.1. Use the same account host when provisioning it. If the username already exists, manage its password with ALTER USER instead of recreating it. Keep the root password out of the application.

## 3. Configure the project

In VS Code, copy `.env.example` to a new file named `.env` (not `.env.txt`).
Set DB_PASSWORD to the password you chose above. For special characters such as #, wrap the value in double quotes.

Generate a session secret in the terminal:

```powershell
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Copy the output into SESSION_SECRET in `.env`. Keep `.env` private.

## 4. Install and run

Run these commands one at a time from the project folder:

```powershell
npm install
npm run setup
npm run create-admin
npm start
```

When creating the administrator, enter a username, display name and a unique password of at least 12 characters. Password input is visible in this local setup terminal; do not share screenshots. The database stores only its salted scrypt hash. There is no preset admin account.

Open http://localhost:3000 and log in with that account.
Press Ctrl+C in the terminal to stop. During development, `npm run dev` restarts the app after source changes.

If PowerShell blocks npm.ps1, use `npm.cmd` in place of `npm`, or choose Command Prompt as the VS Code terminal profile.

## 5. Check the behavior

- A wrong password shows a generic error.
- A correct password opens the dashboard.
- Logout returns to login; opening /dashboard after logout redirects to login.
- Sessions persist in the MySQL `sessions` table and cookies expire after eight hours.
- Repeated failed login attempts from one IP are limited. The limit resets when this development server restarts; use a shared limiter store before running multiple server instances.
- `npm test` checks password hashing and incorrect-password rejection.

## Project files

| File | Purpose |
| --- | --- |
| server.js | Routes, sessions, CSRF validation, login and logout |
| db.js | MySQL connection pool |
| password.js | Password hashing and verification |
| views/login.ejs | Login page |
| views/dashboard.ejs | Protected dashboard |
| public/style.css | Responsive styling |
| scripts/setup.js | Creates users table |
| scripts/create-admin.js | Creates first administrator |

## Troubleshooting

| Message | Check |
| --- | --- |
| ECONNREFUSED | MySQL service is running; DB_HOST and DB_PORT are correct |
| Access denied | App account host, username, password and privileges |
| Unknown database | Execute the CREATE DATABASE statement |
| users table missing | Run npm run setup |
| SESSION_SECRET error | Set a random value of at least 32 characters |
| EADDRINUSE | Change PORT in .env to 3001 and open localhost:3001 |

## Scope and validation

This package starts a local server bound to 127.0.0.1. User roles are recorded but no role-based ERP permissions are implemented yet. Password reset, user management, audit trails and the business modules will be added later.

Before public deployment, configure HTTPS, a reverse proxy and Express proxy trust for that specific infrastructure, secure cookies, backups, deployment secrets and persistent rate limiting. Set NODE_ENV=production only with HTTPS configured. Do not expose this local development setup directly to the internet.

The authoring environment cannot connect to your Windows MySQL server. Verify database creation, admin setup and login on your computer using the steps above.
