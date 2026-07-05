const express = require('express');
const nodemailer = require('nodemailer');

const app = express();
app.use(express.json());

// Autenticación simple con API key
const API_KEY = process.env.MAILER_API_KEY;

function auth(req, res, next) {
  const key = req.headers['x-api-key'];
  if (!API_KEY || key !== API_KEY) {
    return res.status(401).json({ error: 'No autorizado' });
  }
  next();
}

// Inicializar transporte Gmail OAuth2
function createTransport() {
  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      type: 'OAuth2',
      user: process.env.GMAIL_USER,
      clientId: process.env.GMAIL_CLIENT_ID,
      clientSecret: process.env.GMAIL_CLIENT_SECRET,
      refreshToken: process.env.GMAIL_REFRESH_TOKEN,
    },
  });
}

// POST /send
app.post('/send', auth, async (req, res) => {
  const { to, subject, html } = req.body;
  if (!to || !subject || !html) {
    return res.status(400).json({ error: 'Faltan campos: to, subject, html' });
  }
  try {
    const transport = createTransport();
    const info = await transport.sendMail({
      from: process.env.EMAIL_FROM || `GESTEK <${process.env.GMAIL_USER}>`,
      to: Array.isArray(to) ? to.join(',') : to,
      subject,
      html,
    });
    console.log('[mailer] enviado:', info.messageId);
    res.json({ ok: true, messageId: info.messageId });
  } catch (e) {
    console.error('[mailer] error:', e.message);
    res.status(500).json({ ok: false, error: e.message });
  }
});

// GET /health
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`[mailer] corriendo en puerto ${PORT}`));
