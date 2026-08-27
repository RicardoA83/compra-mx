const express = require('express');
const mysql = require('mysql2');
const nodemailer = require('nodemailer');
const path = require('path');
const app = express();

const PUERTO = 3000;

// ========== CONEXIÓN BASE DE DATOS ==========
const db = mysql.createPool({
  host: 'localhost',
  user: 'root',
  password: 'Mazizo12?', // ⚠️ Pon tu contraseña de MySQL
  database: 'compra_mx',
  port: 3306,
  waitForConnections: true
});

// ========== CORREO DE GMAIL ==========
const transportador = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'rg0022087@gmail.com',        // ✅ Tu correo
    pass: 'wiov lbat kvtd lqqy'          // ⚠️ Tu clave de aplicación de Gmail
  }
});

// ========== MIDDLEWARE ==========
app.use(express.json());
app.use(express.static(path.join(__dirname)));

// ========== CREAR TABLAS ==========
const crearTablas = async () => {
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
};
crearTablas();

// ========== REGISTRO con correo de bienvenida ==========
app.post('/api/registro', async (req, res) => {
  try {
    const { nombre, correo, telefono, pass } = req.body;
    
    const [existe] = await db.promise().query('SELECT id FROM usuarios WHERE correo = ?', [correo]);
    if (existe.length > 0) {
      return res.json({ exito: false, mensaje: '⚠️ Este correo ya está registrado' });
    }
    
    await db.promise().query(
      'INSERT INTO usuarios (nombre, correo, telefono, password) VALUES (?, ?, ?, ?)',
      [nombre, correo, telefono, pass]
    );

    // 📧 Correo de bienvenida
    await transportador.sendMail({
      from: '"ComproMío MX" <rg0022087@gmail.com>',
      to: correo,
      subject: '✅ ¡Bienvenido a ComproMío MX!',
      text: `Hola ${nombre}! 👋

Gracias por crear tu cuenta con nosotros 🎉

Tus datos de acceso:
📧 Correo: ${correo}
🔑 Contraseña: ${pass}

Guarda bien tu contraseña. Puedes recuperarla desde la página si la olvidas.

Visita: http://localhost:3000

ComproMío MX — Tu tienda de confianza 🇲🇽`.trim()
    });

    res.json({ exito: true, mensaje: '✅ Cuenta creada. Revisa tu correo 📧' });
  } catch (e) {
    console.log('❌ Error registro:', e);
    res.json({ exito: false, mensaje: 'Error: ' + e.message });
  }
});

// ========== INICIAR SESIÓN ==========
app.post('/api/login', async (req, res) => {
  try {
    const { correo, pass } = req.body;
    const [usuarios] = await db.promise().query(
      'SELECT * FROM usuarios WHERE correo = ? AND password = ?',
      [correo, pass]
    );
    if (usuarios.length === 0) {
      return res.json({ exito: false, mensaje: '⚠️ Correo o contraseña incorrectos' });
    }
    res.json({ exito: true, usuario: { id: usuarios[0].id, nombre: usuarios[0].nombre, correo: usuarios[0].correo } });
  } catch (e) {
    res.json({ exito: false, mensaje: 'Error: ' + e.message });
  }
});

// ========== RECUPERAR CONTRASEÑA — ¡FUNCIONANDO! ==========
app.post('/api/recuperar-contrasena', async (req, res) => {
  try {
    const { correo } = req.body;

    const [usuarios] = await db.promise().query(
      'SELECT nombre, password FROM usuarios WHERE correo = ?',
      [correo]
    );

    if (usuarios.length === 0) {
      return res.json({ exito: false, mensaje: '⚠️ No existe ninguna cuenta con este correo' });
    }

    const { nombre, password } = usuarios[0];

    // 📧 Enviar contraseña por correo
    await transportador.sendMail({
      from: '"ComproMío MX" <rg0022087@gmail.com>',
      to: correo,
      subject: '🔓 Recuperación de Contraseña — ComproMío MX',
      text: `Hola ${nombre}! 👋

Solicitaste recuperar tu contraseña 🔑

Aquí tienes tus datos de acceso:
📧 Correo: ${correo}
🔑 Contraseña: ${password}

Puedes entrar con normalidad en:
http://localhost:3000

Te recomendamos cambiarla después de entrar.
Si no fuiste tú, ignora este mensaje.

ComproMío MX — Tu tienda de confianza 🇲🇽`.trim()
    });

    res.json({ 
      exito: true, 
      mensaje: '✅ Te enviamos tu contraseña por correo 📧 Revisa tu bandeja de entrada (y Spam)' 
    });
  } catch (e) {
    console.log('❌ Error recuperación:', e.message);
    res.json({ exito: false, mensaje: 'Error al enviar el correo: ' + e.message });
  }
});

// ========== PEDIDOS ==========
app.post('/api/pedido', async (req, res) => {
  try {
    const { numero, nombre, correo, telefono, direccion, metodoPago, referencia, total, productos } = req.body;

    await db.promise().query(
      `INSERT INTO pedidos (numero, nombre, correo, telefono, direccion, metodoPago, referencia, total, productos)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [numero, nombre, correo, telefono, direccion, metodoPago, referencia, total, JSON.stringify(productos)]
    );

    const lista = productos.map(p => `• ${p.nombre} — $${p.precio.toLocaleString()} MXN`).join('\n');
    const infoRef = referencia ? `\n📌 Referencia: ${referencia}` : '';

    await transportador.sendMail({
      from: '"ComproMío MX" <rg0022087@gmail.com>',
      to: correo,
      subject: `✅ Compra confirmada — ${numero}`,
      text: `¡Gracias por tu compra, ${nombre}! 🎉

📦 Pedido: ${numero}
💰 Total: $${total.toLocaleString()} MXN

🛒 Productos:
${lista}

💳 Método de pago: ${metodoPago}${infoRef}
📍 Dirección: ${direccion}
📱 Teléfono: ${telefono}

Te contactaremos pronto para coordinar la entrega 🚚

ComproMío MX — Tu tienda de confianza`.trim()
    });

    res.json({ exito: true, mensaje: '✅ Pedido registrado y correo enviado' });
  } catch (e) {
    console.log('❌ Error pedido:', e);
    res.json({ exito: false, mensaje: e.message });
  }
});

// ========== PANEL DE ADMINISTRACIÓN ==========
app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'panel.html'));
});

app.get('/api/admin/pedidos', async (req, res) => {
  const [pedidos] = await db.promise().query('SELECT * FROM pedidos ORDER BY fecha DESC');
  res.json({ pedidos });
});

app.get('/api/admin/usuarios', async (req, res) => {
  const [usuarios] = await db.promise().query('SELECT id, nombre, correo, telefono, fecha FROM usuarios');
  res.json({ usuarios });
});

app.delete('/api/admin/pedidos/:numero', async (req, res) => {
  await db.promise().query('DELETE FROM pedidos WHERE numero = ?', [req.params.numero]);
  res.json({ exito: true, mensaje: '✅ Pedido eliminado' });
});

app.delete('/api/admin/usuarios/:id', async (req, res) => {
  await db.promise().query('DELETE FROM usuarios WHERE id = ?', [req.params.id]);
  res.json({ exito: true, mensaje: '✅ Usuario eliminado' });
});

// Página principal
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// ========== INICIAR SERVIDOR ==========
app.listen(PUERTO, '0.0.0.0', () => {
  console.log('═══════════════════════════════════════');
  console.log(`🚀 Tienda:   http://localhost:${PUERTO}`);
  console.log(`📊 Panel:    http://localhost:${PUERTO}/admin`);
  console.log('═══════════════════════════════════════');
});