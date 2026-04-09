const { Pool } = require('pg');

const connectionString = process.env.POSTGRES_URL || process.env.DATABASE_URL;

const pool = new Pool({
  connectionString: connectionString ? (connectionString.includes('sslmode') ? connectionString : `${connectionString}?sslmode=require`) : undefined,
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
