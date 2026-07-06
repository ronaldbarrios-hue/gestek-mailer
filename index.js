const express = require('express');
const { Resend } = require('resend');

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

// Cliente de Resend (envía por HTTPS, no usa SMTP/puertos bloqueados)
const resend = new Resend(process.env.RESEND_API_KEY);

// POST /send
app.post('/send', auth, async (req, res) => {
  const { to, subject, html } = req.body;
  if (!to || !subject || !html) {
    return res.status(400).json({ error: 'Faltan campos: to, subject, html' });
  }
  try {
    const { data, error } = await resend.emails.send({
      from: process.env.EMAIL_FROM || 'GESTEK <notificaciones@gestekeventost.dpdns.org>',
      to: Array.isArray(to) ? to : [to],
      subject,
      html,
    });

    if (error) {
      console.error('[mailer] error de Resend:', error);
      return res.status(500).json({ ok: false, error: error.message || error });
    }

    console.log('[mailer] enviado:', data.id);
    res.json({ ok: true, messageId: data.id });
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
