const { Pool } = require('pg');
const express = require('express');
const nodemailer = require('nodemailer');
const path = require('path');
const app = express();

const PUERTO = process.env.PORT || 3000;

// Conexión a Supabase
const db = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT || 5432,
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME || 'postgres',
  ssl: { rejectUnauthorized: false }
});

db.connect()
  .then(() => console.log('✅ CONECTADO A SUPABASE'))
  .catch(e => console.log('❌ ERROR DE CONEXIÓN:', e.message));

app.use(express.json());
app.use(express.static(path.join(__dirname)));

// Ruta de registro
app.post('/api/registro', async (req, res) => {
  try {
    const { nombre, correo, telefono, password } = req.body;
    
    const resultado = await db.query(
      'INSERT INTO usuarios (nombre, correo, telefono, password) VALUES ($1, $2, $3, $4) RETURNING *',
      [nombre, correo, telefono, password]
    );
    
    res.json({ exito: true, mensaje: '✅ Cuenta creada exitosamente' });
  } catch (e) {
    console.log('Error:', e.message);
    if (e.code === '23505') {
      res.json({ exito: false, mensaje: '⚠️ Este correo ya está registrado' });
    } else {
      res.json({ exito: false, mensaje: 'Error: ' + e.message });
    }
  }
});

app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));
app.get('/admin', (req, res) => res.sendFile(path.join(__dirname, 'panel.html')));

app.listen(PUERTO, '0.0.0.0', () => {
  console.log(`🚀 Servidor en puerto ${PUERTO}`);
});
