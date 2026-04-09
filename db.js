const Database = require('better-sqlite3');
const path = require('path');
const bcrypt = require('bcryptjs');

const dbPath = path.resolve(__dirname, 'database.db');
const db = new Database(dbPath);

// Create tables
db.exec(`
    CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE,
        email TEXT UNIQUE,
        password_hash TEXT,
        display_name TEXT DEFAULT 'User',
        role TEXT DEFAULT 'user',
        gemini_api_key TEXT,
        freepik_api_key TEXT,
        leonardo_api_key TEXT,
        openai_api_key TEXT,
        profile_image TEXT,
        status TEXT DEFAULT 'pending',
        setup_token TEXT,
        token_expires DATETIME,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS invited_users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT UNIQUE NOT NULL,
        display_name TEXT,
        invited_by INTEGER,
        setup_token TEXT,
        token_expires DATETIME,
        status TEXT DEFAULT 'pending',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (invited_by) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        type TEXT NOT NULL,
        prompt_text TEXT NOT NULL,
        result_text TEXT,
        platform TEXT,
        metadata TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS settings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        pref_key TEXT NOT NULL,
        pref_value TEXT,
        UNIQUE(user_id, pref_key),
        FOREIGN KEY (user_id) REFERENCES users(id)
    );
`);

// Seed Admin if not exists
const adminCheck = db.prepare('SELECT * FROM users WHERE role = ?').get('admin');
if (!adminCheck) {
    const hash = bcrypt.hashSync('admin123', 10);
    db.prepare('INSERT INTO users (username, email, password_hash, role, display_name, status) VALUES (?, ?, ?, ?, ?, ?)').run('admin', 'admin@promptcraft.com', hash, 'admin', 'System Admin', 'active');
    console.log('Seeded initial admin user (admin / admin123)');
}

module.exports = db;
