const { Pool } = require('pg');
require('dotenv').config();

// Gunakan connection string dari environment variable Supabase
// Format: postgresql://postgres:[PASSWORD]@[HOST]:5432/postgres
const connectionString = process.env.DATABASE_URL;

const pool = new Pool({
  connectionString: connectionString,
  ssl: {
    rejectUnauthorized: false
  }
});

module.exports = {
  query: (text, params) => pool.query(text, params),
  
  // Method untuk konsistensi dengan server.js (kita harus ubah server.js menjadi async)
  prepare: (text) => {
    return {
      run: async (...params) => {
        // Ganti ? menjadi $1, $2, etc untuk PostgreSQL
        const pgQuery = text.replace(/\?/g, (_, __, str) => `$${(str.match(/\?/g) || []).length + 1}`);
        return pool.query(pgQuery, params);
      },
      get: async (...params) => {
        const pgQuery = text.replace(/\?/g, (_, __, str) => `$${(str.match(/\?/g) || []).length + 1}`);
        const res = await pool.query(pgQuery, params);
        return res.rows[0];
      },
      all: async (...params) => {
        const pgQuery = text.replace(/\?/g, (_, __, str) => `$${(str.match(/\?/g) || []).length + 1}`);
        const res = await pool.query(pgQuery, params);
        return res.rows;
      }
    };
  },
  
  initDb: async () => {
    try {
      // Inisialisasi tabel di Supabase
      await pool.query(`
        CREATE TABLE IF NOT EXISTS users (
          id SERIAL PRIMARY KEY,
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
          token_expires TIMESTAMP,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS invited_users (
          id SERIAL PRIMARY KEY,
          email TEXT UNIQUE NOT NULL,
          display_name TEXT,
          invited_by INTEGER REFERENCES users(id),
          setup_token TEXT,
          token_expires TIMESTAMP,
          status TEXT DEFAULT 'pending',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS history (
          id SERIAL PRIMARY KEY,
          user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
          type TEXT NOT NULL,
          prompt_text TEXT NOT NULL,
          result_text TEXT,
          platform TEXT,
          metadata JSONB,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS settings (
          id SERIAL PRIMARY KEY,
          user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
          pref_key TEXT NOT NULL,
          pref_value TEXT,
          UNIQUE(user_id, pref_key)
        );
      `);
      console.log('Supabase (PostgreSQL) tables initialized');
    } catch (err) {
      console.error('Error initializing database:', err);
    }
  }
};
