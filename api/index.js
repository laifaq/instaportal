require('dotenv').config();
const express = require('express');
const session = require('express-session');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const path = require('path');
const db = require('./db'); // Ini akan merujuk ke api/db.js

const app = express();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Konfigurasi session yang aman untuk Vercel
app.use(session({
    secret: process.env.SESSION_SECRET || 'promptcraft-studio-v2-secret-2026',
    resave: false,
    saveUninitialized: false,
    cookie: { 
        secure: true, 
        maxAge: 24 * 60 * 60 * 1000 
    }
}));

// Auth Middlewares
const isAuthenticated = (req, res, next) => {
    if (req.session.userId) return next();
    res.status(401).json({ error: 'Unauthorized' });
};

const isAdmin = async (req, res, next) => {
    if (req.session.role === 'admin') return next();
    res.status(403).json({ error: 'Access denied' });
};

// ==========================================
//  AUTH ROUTES
// ==========================================

app.post('/api/auth/register', async (req, res) => {
    const { username, email, password, display_name } = req.body;
    if (!username || !password || !email) return res.status(400).json({ error: 'Username, email and password required' });
    try {
        const hash = bcrypt.hashSync(password, 10);
        await db.prepare('INSERT INTO users (username, email, password_hash, display_name, status) VALUES (?, ?, ?, ?, ?)').run(username, email, hash, display_name || username, 'active');
        res.status(201).json({ message: 'User created' });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.post('/api/auth/check-identity', async (req, res) => {
    const { identity } = req.body;
    if (!identity) return res.status(400).json({ error: 'Identity required' });
    const user = await db.prepare('SELECT id, username, email, display_name, status FROM users WHERE username = ? OR email = ?').get(identity, identity);
    if (!user) return res.status(404).json({ found: false, message: 'Akun tidak ditemukan.' });
    res.json({ found: true, pending: user.status === 'pending', display_name: user.display_name, username: user.username });
});

app.post('/api/auth/login', async (req, res) => {
    const { username, password } = req.body;
    const user = await db.prepare('SELECT * FROM users WHERE (username = ? OR email = ?) AND status = ?').get(username, username, 'active');
    if (user && user.password_hash && bcrypt.compareSync(password, user.password_hash)) {
        req.session.userId = user.id;
        req.session.userName = user.username;
        req.session.role = user.role;
        req.session.displayName = user.display_name;
        res.json({ message: 'Login success', user: { id: user.id, username: user.username, role: user.role, displayName: user.display_name, email: user.email } });
    } else {
        res.status(401).json({ error: 'Password salah.' });
    }
});

app.get('/api/auth/me', async (req, res) => {
    if (req.session.userId) {
        const user = await db.prepare('SELECT id, username, role, display_name, gemini_api_key, freepik_api_key, leonardo_api_key, openai_api_key FROM users WHERE id = ?').get(req.session.userId);
        res.json({ user });
    } else {
        res.status(401).json({ error: 'Not logged in' });
    }
});

app.post('/api/auth/logout', (req, res) => {
    req.session.destroy();
    res.json({ message: 'Logged out' });
});

// ==========================================
//  USER API ROUTES
// ==========================================

app.post('/api/user/profile', isAuthenticated, async (req, res) => {
    const { display_name, gemini_api_key, freepik_api_key, leonardo_api_key, openai_api_key } = req.body;
    const stmt = db.prepare(`
        UPDATE users SET 
            display_name = COALESCE(?, display_name), 
            gemini_api_key = COALESCE(?, gemini_api_key),
            freepik_api_key = COALESCE(?, freepik_api_key),
            leonardo_api_key = COALESCE(?, leonardo_api_key),
            openai_api_key = COALESCE(?, openai_api_key)
        WHERE id = ?
    `);
    await stmt.run(display_name, gemini_api_key, freepik_api_key, leonardo_api_key, openai_api_key, req.session.userId);
    res.json({ message: 'Profile updated' });
});

app.get('/api/history', isAuthenticated, async (req, res) => {
    const history = await db.prepare('SELECT * FROM history WHERE user_id = ? ORDER BY created_at DESC').all(req.session.userId);
    res.json({ history: history.map(h => ({ ...h, metadata: (typeof h.metadata === 'string' ? JSON.parse(h.metadata) : h.metadata) })) });
});

app.post('/api/history', isAuthenticated, async (req, res) => {
    const { type, prompt_text, result_text, platform, metadata } = req.body;
    await db.prepare('INSERT INTO history (user_id, type, prompt_text, result_text, platform, metadata) VALUES (?, ?, ?, ?, ?, ?)').run(
        req.session.userId, type, prompt_text, result_text, platform, JSON.stringify(metadata || {})
    );
    res.json({ message: 'History added' });
});

// Export for Vercel
module.exports = app;
