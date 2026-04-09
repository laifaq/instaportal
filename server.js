require('dotenv').config();
const express = require('express');
const session = require('express-session');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const path = require('path');
const db = require('./db');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname)));
app.use(session({
    secret: process.env.SESSION_SECRET || 'promptcraft-studio-v2-secret-2026',
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false, maxAge: 24 * 60 * 60 * 1000 } // 24 hours
}));

// Auth Middlewares
const isAuthenticated = (req, res, next) => {
    if (req.session.userId) return next();
    res.status(401).json({ error: 'Unauthorized' });
};

const isAdmin = (req, res, next) => {
    if (req.session.role === 'admin') return next();
    res.status(403).json({ error: 'Access denied' });
};

// ==========================================
//  AUTH ROUTES
// ==========================================

// Register (self-service)
app.post('/api/auth/register', (req, res) => {
    const { username, email, password, display_name } = req.body;
    if (!username || !password || !email) return res.status(400).json({ error: 'Username, email and password required' });

    try {
        const hash = bcrypt.hashSync(password, 10);
        const stmt = db.prepare('INSERT INTO users (username, email, password_hash, display_name, status) VALUES (?, ?, ?, ?, ?)');
        stmt.run(username, email, hash, display_name || username, 'active');
        res.status(201).json({ message: 'User created' });
    } catch (e) {
        if (e.message.includes('UNIQUE')) {
            if (e.message.includes('username')) return res.status(400).json({ error: 'Username already exists' });
            if (e.message.includes('email')) return res.status(400).json({ error: 'Email already exists' });
        }
        res.status(500).json({ error: e.message });
    }
});

// Check Identity (Step 1 of two-step login)
app.post('/api/auth/check-identity', (req, res) => {
    const { identity } = req.body;
    if (!identity) return res.status(400).json({ error: 'Identity required' });

    const user = db.prepare('SELECT id, username, email, display_name, status FROM users WHERE username = ? OR email = ?').get(identity, identity);
    if (!user) return res.status(404).json({ found: false, message: 'Akun tidak ditemukan. Silakan daftar terlebih dahulu.' });
    if (user.status === 'pending') return res.status(403).json({ found: true, pending: true, message: 'Akun Anda belum diaktifkan. Periksa email untuk link pengaturan password.' });

    res.json({ found: true, pending: false, display_name: user.display_name, username: user.username });
});

// Set Password via Invite Token
app.post('/api/auth/set-password', (req, res) => {
    const { token, username, password } = req.body;
    if (!token || !password) return res.status(400).json({ error: 'Token and password required' });

    const invite = db.prepare('SELECT * FROM invited_users WHERE setup_token = ?').get(token);
    if (!invite) return res.status(400).json({ error: 'Token tidak valid atau sudah digunakan.' });
    if (new Date(invite.token_expires) < new Date()) return res.status(400).json({ error: 'Token sudah kadaluarsa. Minta admin untuk kirim ulang undangan.' });

    try {
        const hash = bcrypt.hashSync(password, 10);
        const finalUsername = username || invite.email.split('@')[0].replace(/[^a-zA-Z0-9]/g, '');

        // Check if user already exists by email
        const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(invite.email);
        if (existing) {
            // Update existing pending account
            db.prepare('UPDATE users SET username = ?, password_hash = ?, status = ?, setup_token = NULL, token_expires = NULL WHERE email = ?')
              .run(finalUsername, hash, 'active', invite.email);
        } else {
            // Create new account
            db.prepare('INSERT INTO users (username, email, password_hash, display_name, status) VALUES (?, ?, ?, ?, ?)')
              .run(finalUsername, invite.email, hash, invite.display_name || finalUsername, 'active');
        }
        // Mark invite as completed
        db.prepare('UPDATE invited_users SET status = ? WHERE setup_token = ?').run('completed', token);
        res.json({ message: 'Password berhasil dibuat. Silakan login.' });
    } catch (e) {
        if (e.message.includes('UNIQUE')) return res.status(400).json({ error: 'Username sudah digunakan, pilih yang lain.' });
        res.status(500).json({ error: e.message });
    }
});

// Verify Invite Token (GET)
app.get('/api/auth/verify-invite', (req, res) => {
    const { token } = req.query;
    if (!token) return res.status(400).json({ valid: false, message: 'Token diperlukan.' });

    const invite = db.prepare('SELECT * FROM invited_users WHERE setup_token = ? AND status = ?').get(token, 'pending');
    if (!invite) return res.status(404).json({ valid: false, message: 'Token tidak valid atau sudah digunakan.' });
    if (new Date(invite.token_expires) < new Date()) return res.status(410).json({ valid: false, message: 'Token sudah kadaluarsa. Minta admin untuk kirim ulang undangan.' });

    res.json({ valid: true, email: invite.email, display_name: invite.display_name });
});

app.post('/api/auth/login', (req, res) => {
    const { username, password } = req.body;
    const user = db.prepare('SELECT * FROM users WHERE (username = ? OR email = ?) AND status = ?').get(username, username, 'active');

    if (user && user.password_hash && bcrypt.compareSync(password, user.password_hash)) {
        req.session.userId = user.id;
        req.session.userName = user.username;
        req.session.role = user.role;
        req.session.displayName = user.display_name;
        res.json({ message: 'Login success', user: { id: user.id, username: user.username, role: user.role, displayName: user.display_name, email: user.email } });
    } else {
        res.status(401).json({ error: 'Password salah. Coba lagi.' });
    }
});

// Logout
app.post('/api/auth/logout', (req, res) => {
    req.session.destroy();
    res.json({ message: 'Logged out' });
});

// Check Session
app.get('/api/auth/me', (req, res) => {
    if (req.session.userId) {
        const user = db.prepare('SELECT id, username, role, display_name, gemini_api_key, freepik_api_key, leonardo_api_key, openai_api_key FROM users WHERE id = ?').get(req.session.userId);
        res.json({ user });
    } else {
        res.status(401).json({ error: 'Not logged in' });
    }
});

// ==========================================
//  USER API ROUTES
// ==========================================

// Update Profile/API Keys
app.post('/api/user/profile', isAuthenticated, (req, res) => {
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
    stmt.run(display_name, gemini_api_key, freepik_api_key, leonardo_api_key, openai_api_key, req.session.userId);
    res.json({ message: 'Profile updated' });
});

// History - Get
app.get('/api/history', isAuthenticated, (req, res) => {
    const history = db.prepare('SELECT * FROM history WHERE user_id = ? ORDER BY created_at DESC').all(req.session.userId);
    res.json({ history: history.map(h => ({ ...h, metadata: JSON.parse(h.metadata || '{}') })) });
});

// History - Add
app.post('/api/history', isAuthenticated, (req, res) => {
    const { type, prompt_text, result_text, platform, metadata } = req.body;
    const stmt = db.prepare('INSERT INTO history (user_id, type, prompt_text, result_text, platform, metadata) VALUES (?, ?, ?, ?, ?, ?)');
    stmt.run(req.session.userId, type, prompt_text, result_text, platform, JSON.stringify(metadata || {}));
    res.json({ message: 'History added' });
});

// Settings - Get
app.get('/api/settings', isAuthenticated, (req, res) => {
    const settings = db.prepare('SELECT * FROM settings WHERE user_id = ?').all(req.session.userId);
    res.json({ settings });
});

// Settings - Update
app.post('/api/settings', isAuthenticated, (req, res) => {
    const { key, value } = req.body;
    const stmt = db.prepare('INSERT INTO settings (user_id, pref_key, pref_value) VALUES (?, ?, ?) ON CONFLICT(user_id, pref_key) DO UPDATE SET pref_value = excluded.pref_value');
    stmt.run(req.session.userId, key, value);
    res.json({ message: 'Setting updated' });
});

// ==========================================
//  ADMIN API ROUTES
// ==========================================

// Get Global Stats
app.get('/api/admin/stats', isAuthenticated, isAdmin, (req, res) => {
    console.log('Admin Stats Request received');
    try {
        const totalUsers = db.prepare('SELECT COUNT(*) as count FROM users').get().count;
        const totalPrompts = db.prepare('SELECT COUNT(*) as count FROM history').get().count;
        const promptBreakdown = db.prepare('SELECT type, COUNT(*) as count FROM history GROUP BY type').all();
        const recentUsers = db.prepare('SELECT username, display_name, created_at FROM users ORDER BY created_at DESC LIMIT 5').all();

        res.json({
            stats: {
                totalUsers,
                totalPrompts,
                promptBreakdown
            },
            recentUsers
        });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// Get All Users
app.get('/api/admin/users', isAuthenticated, isAdmin, (req, res) => {
    try {
        const users = db.prepare(`
            SELECT u.id, u.username, u.display_name, u.role, u.created_at, 
            (SELECT COUNT(*) FROM history h WHERE h.user_id = u.id) as prompt_count 
            FROM users u
        `).all();
        res.json({ users });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// Delete User
app.delete('/api/admin/users/:id', isAuthenticated, isAdmin, (req, res) => {
    const { id } = req.params;
    if (parseInt(id) === req.session.userId) return res.status(400).json({ error: 'Cannot delete yourself' });
    
    try {
        db.prepare('DELETE FROM users WHERE id = ?').run(id);
        db.prepare('DELETE FROM history WHERE user_id = ?').run(id);
        res.json({ message: 'User deleted' });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// Invite User by Email
app.post('/api/admin/invite', isAuthenticated, isAdmin, (req, res) => {
    const { email, display_name } = req.body;
    if (!email) return res.status(400).json({ error: 'Email required' });

    try {
        const token = crypto.randomBytes(32).toString('hex');
        const expires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(); // 7 days

        // Check if already invited
        const existing = db.prepare('SELECT id, status FROM invited_users WHERE email = ?').get(email);
        if (existing && existing.status === 'pending') {
            // Refresh token
            db.prepare('UPDATE invited_users SET setup_token = ?, token_expires = ?, display_name = ? WHERE email = ?')
              .run(token, expires, display_name || null, email);
        } else if (!existing) {
            db.prepare('INSERT INTO invited_users (email, display_name, invited_by, setup_token, token_expires) VALUES (?, ?, ?, ?, ?)')
              .run(email, display_name || null, req.session.userId, token, expires);
        } else {
            return res.status(400).json({ error: 'Email ini sudah terdaftar sebagai user aktif.' });
        }

        const setupUrl = `${req.protocol}://${req.get('host')}/set-password.html?token=${token}`;
        res.json({ message: 'Undangan berhasil dibuat', setupUrl, token, email });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// List Invites
app.get('/api/admin/invites', isAuthenticated, isAdmin, (req, res) => {
    try {
        const invites = db.prepare('SELECT id, email, display_name, status, created_at, token_expires FROM invited_users ORDER BY created_at DESC').all();
        res.json({ invites });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// Resend Invite (refresh token)
app.post('/api/admin/invites/:id/resend', isAuthenticated, isAdmin, (req, res) => {
    const { id } = req.params;
    try {
        const token = crypto.randomBytes(32).toString('hex');
        const expires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
        db.prepare('UPDATE invited_users SET setup_token = ?, token_expires = ?, status = ? WHERE id = ?').run(token, expires, 'pending', id);
        const invite = db.prepare('SELECT email FROM invited_users WHERE id = ?').get(id);
        const setupUrl = `${req.protocol}://${req.get('host')}/set-password.html?token=${token}`;
        res.json({ message: 'Token diperbarui', setupUrl, email: invite.email });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// ==========================================
//  AI ENGINE PROXY ROUTES
// ==========================================

// Enhance prompt with Gemini
app.post('/api/ai/enhance-prompt', isAuthenticated, async (req, res) => {
    const { prompt } = req.body;
    const user = db.prepare('SELECT gemini_api_key FROM users WHERE id = ?').get(req.session.userId);
    if (!user?.gemini_api_key) return res.status(400).json({ error: 'Gemini API key belum dikonfigurasi di Settings.' });

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${user.gemini_api_key}`;
    const payload = {
        contents: [{ parts: [{ text: `Tingkatkan ide ringkas berikut menjadi deskripsi prompt gambar yang sangat detail, dramatis, dan sinematik. Tuliskan hasilnya dalam Bahasa Inggris. Jangan tambahkan teks pengantar atau penutup, berikan HANYA prompt teksnya saja. Ide awal: "${prompt}"` }] }],
        systemInstruction: { parts: [{ text: "You are an expert AI image prompt engineer." }] }
    };

    try {
        const response = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
        if (!response.ok) throw new Error(`Gemini error: ${response.status}`);
        const data = await response.json();
        const enhanced = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!enhanced) throw new Error('Empty Gemini response');
        res.json({ enhanced: enhanced.trim() });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// Generate Image via Freepik
app.post('/api/ai/freepik', isAuthenticated, async (req, res) => {
    const { prompt, styling } = req.body;
    const user = db.prepare('SELECT freepik_api_key FROM users WHERE id = ?').get(req.session.userId);
    if (!user?.freepik_api_key) return res.status(400).json({ error: 'Freepik API key belum dikonfigurasi di Settings.' });

    try {
        const response = await fetch('https://api.freepik.com/v1/ai/text-to-image', {
            method: 'POST',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json',
                'x-freepik-api-key': user.freepik_api_key
            },
            body: JSON.stringify({ prompt, styling })
        });
        if (!response.ok) {
            const err = await response.json().catch(() => ({}));
            throw new Error(err.message || err.error || `HTTP ${response.status}`);
        }
        const data = await response.json();
        res.json(data);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// Generate Image via Leonardo AI
app.post('/api/ai/leonardo/generate', isAuthenticated, async (req, res) => {
    const { prompt, height, width } = req.body;
    const user = db.prepare('SELECT leonardo_api_key FROM users WHERE id = ?').get(req.session.userId);
    if (!user?.leonardo_api_key) return res.status(400).json({ error: 'Leonardo API key belum dikonfigurasi di Settings.' });

    try {
        const response = await fetch('https://cloud.leonardo.ai/api/rest/v1/generations', {
            method: 'POST',
            headers: { 'accept': 'application/json', 'content-type': 'application/json', 'authorization': `Bearer ${user.leonardo_api_key}` },
            body: JSON.stringify({ prompt, height, width, num_images: 1, promptMagic: true })
        });
        if (!response.ok) throw new Error(`Leonardo HTTP ${response.status}`);
        const data = await response.json();
        res.json(data);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// Poll Leonardo generation status (v1)
app.get('/api/ai/leonardo/status/:genId', isAuthenticated, async (req, res) => {
    const user = db.prepare('SELECT leonardo_api_key FROM users WHERE id = ?').get(req.session.userId);
    if (!user?.leonardo_api_key) return res.status(400).json({ error: 'Leonardo API key missing.' });

    try {
        const response = await fetch(`https://cloud.leonardo.ai/api/rest/v1/generations/${req.params.genId}`, {
            headers: { 'accept': 'application/json', 'authorization': `Bearer ${user.leonardo_api_key}` }
        });
        if (!response.ok) throw new Error(`Poll failed: ${response.status}`);
        const data = await response.json();
        res.json(data);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// Generate Video via Leonardo AI (Seedance 1.0 Lite)
app.post('/api/ai/leonardo/video', isAuthenticated, async (req, res) => {
    const { prompt, duration = 4, width = 704, height = 1248 } = req.body; // 9:16 portrait default
    const user = db.prepare('SELECT leonardo_api_key FROM users WHERE id = ?').get(req.session.userId);
    if (!user?.leonardo_api_key) return res.status(400).json({ error: 'Leonardo API key belum dikonfigurasi di Settings.' });

    try {
        const response = await fetch('https://cloud.leonardo.ai/api/rest/v2/generations', {
            method: 'POST',
            headers: { 
                'accept': 'application/json', 
                'content-type': 'application/json', 
                'authorization': `Bearer ${user.leonardo_api_key}` 
            },
            body: JSON.stringify({ 
                model: "seedance-1.0-lite",
                public: false,
                parameters: {
                    prompt: prompt,
                    duration: duration,
                    width: width,
                    height: height,
                    mode: "RESOLUTION_720",
                    prompt_enhance: "OFF"
                }
            })
        });
        if (!response.ok) {
            const err = await response.json().catch(() => ({}));
            throw new Error(err.error || `Leonardo HTTP ${response.status}`);
        }
        const data = await response.json();
        // data looks like { generationJob: { generationId: "..." } } or sdGenerationJob
        res.json(data);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// Generate Image via Google Imagen
app.post('/api/ai/imagen', isAuthenticated, async (req, res) => {
    const { prompt, aspectRatio } = req.body;
    const user = db.prepare('SELECT gemini_api_key FROM users WHERE id = ?').get(req.session.userId);
    if (!user?.gemini_api_key) return res.status(400).json({ error: 'Gemini/Google API key belum dikonfigurasi di Settings.' });

    try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/imagen-4.0-generate-001:predict?key=${user.gemini_api_key}`;
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                instances: { prompt },
                parameters: { sampleCount: 1, aspectRatio: aspectRatio || '1:1' }
            })
        });
        if (!response.ok) throw new Error(`Imagen HTTP ${response.status}`);
        const data = await response.json();
        res.json(data);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// Export for Vercel
module.exports = app;
