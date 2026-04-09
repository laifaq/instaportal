const { Pool } = require('pg');
require('dotenv').config();

// Cari DATABASE_URL, jika tidak ada cari POSTGRES_URL (Vercel default)
const connectionString = process.env.DATABASE_URL || process.env.POSTGRES_URL;

const pool = new Pool({
  connectionString: connectionString + (connectionString && !connectionString.includes('sslmode') ? '?sslmode=require' : ''),
  ssl: {
    rejectUnauthorized: false
  }
});

module.exports = {
  query: (text, params) => pool.query(text, params),
  prepare: (text) => {
    return {
      run: async (...params) => {
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
  }
};
