require("dotenv").config();

const express = require("express");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const cors = require("cors");
const morgan = require("morgan");
const os = require("os");
const db = require("./db");

const app = express();
const PORT = 8080;
const SECRET = process.env.JWT_SECRET || "secreto123";

// Middlewares
app.use(cors());
app.use(express.json());
app.use(morgan("dev"));

// Para identificar el servidor en el que se realiza cada peticion
app.use((req, res, next) => {
    res.setHeader("X-Server-Hostname", os.hostname());
    next(); 
})

// ====== Middleware de autenticación ======
function authenticateToken(req, res, next) {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) return res.sendStatus(401);

  jwt.verify(token, SECRET, (err, user) => {
    if (err) return res.sendStatus(403);
    req.user = user;
    next();
  });
}

// ====== Ruta raíz (para probar balanceo) ======
app.get("/", (req, res) => {
  res.json({
    message: "Servidor funcionando",
    servidor: os.hostname()
  });
});

// ====== Registro ======
app.post("/register", async (req, res) => {
  const { username, password } = req.body;

  const hashedPassword = await bcrypt.hash(password, 10);

  db.query(
    "INSERT INTO users (username, password) VALUES (?, ?)",
    [username, hashedPassword],
    (err) => {
      if (err) {
        return res.status(400).json({ message: "Usuario ya existe" });
      }
      res.json({ message: "Usuario registrado" });
    }
  );
});

// ====== Login ======
app.post("/login", (req, res) => {
  const { username, password } = req.body;

  db.query(
    "SELECT * FROM users WHERE username = ?",
    [username],
    async (err, results) => {
      if (err) {
        console.error("Error en query:", err);
        return res.status(500).json({ message: "Error en el servidor" });
      }

      if (!results || results.length === 0) {
        return res.status(400).json({ message: "Usuario no encontrado" });
      }

      const user = results[0];

      const validPassword = await bcrypt.compare(password, user.password);
      if (!validPassword) {
        return res.status(401).json({ message: "Contraseña incorrecta" });
      }

      const token = jwt.sign(
        { id: user.id, username: user.username },
        SECRET,
        { expiresIn: "1h" }
      );

      res.json({ token });
    }
  );
});

// ====== CRUD protegido ======

// Obtener usuarios
app.get("/users", authenticateToken, (req, res) => {
  db.query("SELECT id, username FROM users", (err, results) => {
    res.json(results);
  });
});

// Crear usuario
app.post("/users", authenticateToken, async (req, res) => {
  const { username, password } = req.body;

  const hashedPassword = await bcrypt.hash(password, 10);

  db.query(
    "INSERT INTO users (username, password) VALUES (?, ?)",
    [username, hashedPassword],
    (err, result) => {
      if (err) return res.status(400).json({ message: "Error" });
      res.json({ id: result.insertId, username });
    }
  );
});

// Actualizar usuario
app.put("/users/:id", authenticateToken, async (req, res) => {
  const { id } = req.params;
  const { username, password } = req.body;

  let query = "UPDATE users SET ";
  const params = [];

  if (username) {
    query += "username = ?, ";
    params.push(username);
  }

  if (password) {
    const hashed = await bcrypt.hash(password, 10);
    query += "password = ?, ";
    params.push(hashed);
  }

  query = query.slice(0, -2);
  query += " WHERE id = ?";
  params.push(id);

  db.query(query, params, () => {
    res.json({ message: "Usuario actualizado" });
  });
});

// Eliminar usuario
app.delete("/users/:id", authenticateToken, (req, res) => {
  const { id } = req.params;

  db.query("DELETE FROM users WHERE id = ?", [id], () => {
    res.json({ message: "Usuario eliminado" });
  });
});

// ====== Start server ======
app.listen(PORT, () => {
  console.log(`Servidor corriendo en puerto ${PORT}`);
});