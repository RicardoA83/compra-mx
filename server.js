const express = require('express');
const { Pool } = require('pg');
const nodemailer = require('nodemailer');
const path = require('path');

const app = express();
const PUERTO = process.env.PORT || 3000;

// ========== CONEXIÓN SUPABASE ==========
const db = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT || 5432,
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME || 'postgres',
  ssl: { rejectUnauthorized: false },
  connectionTimeoutMillis: 5000
});

// Probar conexión
db.connect()
  .then(() => console.log('✅ CONECTADO A SUPABASE'))
  .catch(e => console.log('❌ ERROR CONEXIÓN:', e.message));

// ========== MIDDLEWARE ==========
app.use(express.json());
app.use(express.static(path.join(__dirname)));

// ========== RUTA DE REGISTRO ==========
app.post('/api/registro', async (req, res) => {
  try {
    const { nombre, correo, telefono, password } = req.body;
    console.log('📝 Recibido:', { nombre, correo, telefono });

    const resultado = await db.query(
      `INSERT INTO usuarios (nombre, correo, telefono, password) 
       VALUES ($1, $2, $3, $4) RETURNING id, nombre, correo`,
      [nombre, correo, telefono, password]
    );

    console.log('✅ Usuario creado:', resultado.rows[0]);
    res.json({ 
      exito: true, 
      mensaje: '✅ Cuenta creada correctamente. Ya puedes iniciar sesión.' 
    });

  } catch (e) {
    console.log('❌ Error en registro:', e.code, e.message);
    
    if (e.code === '23505') {
      res.json({ exito: false, mensaje: '⚠️ Este correo ya está registrado.' });
    } else {
      res.json({ exito: false, mensaje: 'Error: ' + e.message });
    }
  }
});

// ========== PÁGINAS ==========
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));
app.get('/admin', (req, res) => res.sendFile(path.join(__dirname, 'panel.html')));

// ========== INICIAR ==========
app.listen(PUERTO, '0.0.0.0', () => {
  console.log(`🚀 Tienda activa en puerto ${PUERTO}`);
});
