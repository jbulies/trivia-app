const session = require('express-session');
const MySQLStore = require('express-mysql-session')(session);
const pool = require('./db_config');

const sessionStore = new MySQLStore({}, pool);

class MySQLSessionStore {
  constructor() {
    this.store = sessionStore;
  }

  set(sid, session, callback) {
    const expires = session.cookie.expires ? Math.floor(new Date(session.cookie.expires).getTime() / 1000) : 0;
    const sql = `
      INSERT INTO sessions (session_id, data, expires)
      VALUES (?, ?, FROM_UNIXTIME(?))
      ON DUPLICATE KEY UPDATE data = ?, expires = FROM_UNIXTIME(?)
    `;
    const values = [sid, JSON.stringify(session), expires, JSON.stringify(session), expires];

    pool.query(sql, values, (err) => {
      callback(err);
    });
  }

  get(sid, callback) {
    const sql = `SELECT data FROM sessions WHERE session_id = ? AND expires > NOW()`;
    pool.query(sql, [sid], (err, results) => {
      if (err) return callback(err);
      if (results.length === 0) return callback(null, null);
      callback(null, JSON.parse(results[0].data));
    });
  }

  destroy(sid, callback) {
    const sql = `DELETE FROM sessions WHERE session_id = ?`;
    pool.query(sql, [sid], (err) => {
      callback(err);
    });
  }

  length(callback) {
    const sql = `SELECT COUNT(*) AS count FROM sessions WHERE expires > NOW()`;
    pool.query(sql, (err, results) => {
      if (err) return callback(err);
      callback(null, results[0].count);
    });
  }

  clear(callback) {
    const sql = `DELETE FROM sessions`;
    pool.query(sql, (err) => {
      callback(err);
    });
  }
}

module.exports = MySQLSessionStore;