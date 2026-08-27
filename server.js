const express = require('express');
const mysql = require('mysql2');
const nodemailer = require('nodemailer');
const path = require('path');
const app = express();

const PUERTO = process.env.PORT || 3000;

// ========== CONEXIÓN BASE DE DATOS ==========
let db;
try {
  db = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASS || '',
    database: process.env.DB_NAME || 'compra_mx',
    port: 3306,
    waitForConnections: true,
    connectionLimit: 5
  });
  console.log('✅ Intentando conectar a la base de datos...');
} catch (e) {
  console.log('⚠️ Sin base de datos — modo demostración');
  db = null;
}

// ========== MIDDLEWARE ==========
app.use(express.json());
app.use(express.static(path.join(__dirname)));

// ========== CREAR TABLAS SOLO SI HAY CONEXIÓN ==========
const crearTablas = async () => {
  if (!db) {
    console.log('ℹ️ Modo demostración activo — sin base de datos');
    return;
  }
  try {
    await db.promise().query(`
      CREATE TABLE IF NOT EXISTS usuarios (
        id INT AUTO_INCREMENT PRIMARY KEY,
        nombre VARCHAR(100) NOT NULL,
        correo VARCHAR(100) UNIQUE NOT NULL,
        telefono VARCHAR(20),
        password VARCHAR(255) NOT NULL,
        fecha TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    await db.promise().query(`
      CREATE TABLE IF NOT EXISTS pedidos (
        id INT AUTO_INCREMENT PRIMARY KEY,
        numero VARCHAR(50) UNIQUE NOT NULL,
        nombre VARCHAR(100),
        correo VARCHAR(100),
        telefono VARCHAR(20),
        direccion TEXT,
        metodoPago VARCHAR(50),
        referencia VARCHAR(100),
        total DECIMAL(10,2),
        productos JSON,
        fecha TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Tablas listas');
  } catch (e) {
    console.log('⚠️ No se pudieron crear tablas:', e.message);
  }
};
crearTablas();

// ========== CORREO DE GMAIL ==========
const transportador = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER || 'tu-correo@gmail.com',
    pass: process.env.EMAIL_PASS || 'tu-clave-de-app'
  }
});

// ========== RUTAS — con protección si no hay BD ==========
app.post('/api/registro', async (req, res) => {
  if (!db) return res.json({ exito: false, mensaje: '⚠️ Registro temporalmente no disponible' });
  // ... resto de tu código de registro ...
});

app.post('/api/login', async (req, res) => {
  if (!db) return res.json({ exito: false, mensaje: '⚠️ Inicio de sesión temporalmente no disponible' });
  // ... resto de tu código de login ...
});

app.post('/api/recuperar-contrasena', async (req, res) => {
  if (!db) return res.json({ exito: false, mensaje: '⚠️ Recuperación no disponible' });
  // ... resto de tu código de recuperación ...
});

app.post('/api/pedido', async (req, res) => {
  if (!db) return res.json({ exito: false, mensaje: '⚠️ Pedidos temporalmente no disponibles' });
  // ... resto de tu código de pedido ...
});

// ========== PÁGINAS ==========
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});
app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'panel.html'));
});

// ========== INICIAR SERVIDOR ==========
app.listen(PUERTO, '0.0.0.0', () => {
  console.log('═══════════════════════════════════════');
  console.log(`🚀 Tienda activa en el puerto ${PUERTO}`);
  console.log(`📊 Panel: /admin`);
  console.log('═══════════════════════════════════════');
});
