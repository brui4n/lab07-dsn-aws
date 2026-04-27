const mysql = require("mysql2");

function connectWithRetry() {
  const pool = mysql.createPool({
    host: "db",
    user: "root",
    password: "root",
    database: "appdb",
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
  });

  pool.getConnection((err, connection) => {
    if (err) {
      console.log("⏳ Esperando MySQL...");
      setTimeout(connectWithRetry, 3000);
    } else {
      console.log("✅ Conectado a MySQL");

      connection.query(`
        CREATE TABLE IF NOT EXISTS users (
          id INT AUTO_INCREMENT PRIMARY KEY,
          username VARCHAR(255) UNIQUE,
          password VARCHAR(255)
        )
      `);

      connection.release();
    }
  });

  return pool;
}

module.exports = connectWithRetry();