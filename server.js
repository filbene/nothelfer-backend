/**
 * Nothelfer Zentrum — Backend
 * Node.js + Express + SQLite + Nodemailer
 * 
 * Start: node server.js
 */

const express       = require('express');
const session       = require('express-session');
const bcrypt        = require('bcryptjs');
const { Resend }    = require('resend');
const Database      = require('better-sqlite3');
const path          = require('path');
const fs            = require('fs');

// ─── CONFIG ────────────────────────────────────────────────────────────────
const config = require('./config.js');

// ─── DATABASE ──────────────────────────────────────────────────────────────
const db = new Database(process.env.DB_PATH || path.join(__dirname, 'data.db'));

db.exec(`
  CREATE TABLE IF NOT EXISTS kurstermine (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    datum_von   TEXT    NOT NULL,
    datum_bis   TEXT    NOT NULL,
    standort    TEXT    NOT NULL,
    beschreibung TEXT   DEFAULT '',
    max_plaetze INTEGER DEFAULT 20,
    aktiv       INTEGER DEFAULT 1,
    erstellt_am TEXT    DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS anmeldungen (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    vorname         TEXT NOT NULL,
    nachname        TEXT NOT NULL,
    email           TEXT NOT NULL,
    telefon         TEXT DEFAULT '',
    strasse         TEXT NOT NULL,
    plz_ort         TEXT NOT NULL,
    kurstermin_id   INTEGER NOT NULL,
    anzahl_personen INTEGER DEFAULT 1,
    bemerkungen     TEXT DEFAULT '',
    status          TEXT DEFAULT 'neu',
    erstellt_am     TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (kurstermin_id) REFERENCES kurstermine(id)
  );

  CREATE TABLE IF NOT EXISTS admin_users (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    username   TEXT UNIQUE NOT NULL,
    password   TEXT NOT NULL
  );
`);

// Preis-Spalte nachrüsten falls noch nicht vorhanden (Migration)
try { db.exec("ALTER TABLE kurstermine ADD COLUMN preis TEXT DEFAULT ''"); } catch(e) {}

// Standard-Admin anlegen falls nicht vorhanden
const adminExists = db.prepare('SELECT id FROM admin_users WHERE username = ?').get(config.admin.username);
if (!adminExists) {
  const hash = bcrypt.hashSync(config.admin.password, 10);
  db.prepare('INSERT INTO admin_users (username, password) VALUES (?, ?)').run(config.admin.username, hash);
  console.log(`✓ Admin-Account erstellt: ${config.admin.username}`);
}

// ─── MAILER (Resend) ───────────────────────────────────────────────────────
const resend = new Resend(process.env.RESEND_API_KEY);

const BENACHRICHTIGUNGS_EMPFAENGER = [
  'metinalimi4@gmail.com',
  'sakiri.aldin@gmail.com',
  'info@nothelferzentrum.ch',
  'info@nb-films.ch',
];

function mailHtmlKunde(anmeldung, terminText) {
  return `<!DOCTYPE html>
<html lang="de"><head><meta charset="UTF-8"><style>
  body { font-family: Arial, sans-serif; background:#f8f6f3; margin:0; padding:0; }
  .wrap { max-width:580px; margin:40px auto; background:#fff; border-radius:16px; overflow:hidden; box-shadow:0 4px 24px rgba(0,0,0,0.08); }
  .header { background:linear-gradient(135deg,#C41E3A,#A01830); padding:36px 40px; text-align:center; }
  .header h1 { color:#fff; margin:0; font-size:26px; font-weight:700; }
  .header p  { color:rgba(255,255,255,0.85); margin:6px 0 0; font-size:14px; }
  .body { padding:36px 40px; }
  .body p { color:#3a352f; line-height:1.7; margin:0 0 16px; }
  .info-box { background:#f8f6f3; border-left:4px solid #C41E3A; border-radius:8px; padding:20px 24px; margin:24px 0; }
  .info-box h3 { margin:0 0 12px; color:#C41E3A; font-size:14px; text-transform:uppercase; letter-spacing:.5px; }
  .info-row { display:flex; justify-content:space-between; padding:6px 0; border-bottom:1px solid #e8e3dc; font-size:14px; }
  .info-row:last-child { border-bottom:none; }
  .info-row .label { color:#9b9488; }
  .info-row .value { font-weight:600; color:#1d1a16; }
  .footer { background:#f1ede8; padding:24px 40px; text-align:center; font-size:12px; color:#9b9488; }
  .footer a { color:#C41E3A; }
</style></head>
<body><div class="wrap">
  <div class="header"><h1>Anmeldung bestätigt ✓</h1><p>Nothelfer Zentrum — Erste Hilfe Kurse Schweiz</p></div>
  <div class="body">
    <p>Guten Tag <strong>${anmeldung.vorname} ${anmeldung.nachname}</strong>,</p>
    <p>vielen Dank für Ihre Anmeldung beim Nothelfer Zentrum! Wir freuen uns, Sie bei uns begrüssen zu dürfen.</p>
    <div class="info-box">
      <h3>Ihre Buchungsdetails</h3>
      <div class="info-row"><span class="label">Kurstermin</span><span class="value">${terminText}</span></div>
      <div class="info-row"><span class="label">Anzahl Personen</span><span class="value">${anmeldung.anzahl_personen}</span></div>
      <div class="info-row"><span class="label">Name</span><span class="value">${anmeldung.vorname} ${anmeldung.nachname}</span></div>
      <div class="info-row"><span class="label">E-Mail</span><span class="value">${anmeldung.email}</span></div>
      ${anmeldung.telefon ? `<div class="info-row"><span class="label">Telefon</span><span class="value">${anmeldung.telefon}</span></div>` : ''}
      <div class="info-row"><span class="label">Adresse</span><span class="value">${anmeldung.strasse}, ${anmeldung.plz_ort}</span></div>
    </div>
    <p>Bitte bringen Sie bequeme Kleidung und flache Schuhe mit. Das Kursmaterial wird von uns bereitgestellt.</p>
    <p>Bei Fragen erreichen Sie uns unter <a href="mailto:info@nothelferzentrum.ch" style="color:#C41E3A;">info@nothelferzentrum.ch</a> oder <a href="tel:+41789655132" style="color:#C41E3A;">+41 78 965 51 32</a>.</p>
    <p>Wir freuen uns auf Sie!<br><strong>Das Team vom Nothelfer Zentrum</strong></p>
  </div>
  <div class="footer">Nothelfer Zentrum · Sirnacherstrasse 7, 9500 Wil SG<br><a href="https://nothelferzentrum.ch">nothelferzentrum.ch</a></div>
</div></body></html>`;
}

function mailHtmlAdmin(anmeldung, terminText) {
  return `<!DOCTYPE html>
<html lang="de"><head><meta charset="UTF-8"><style>
  body { font-family: Arial, sans-serif; background:#f8f6f3; margin:0; padding:0; }
  .wrap { max-width:580px; margin:40px auto; background:#fff; border-radius:16px; overflow:hidden; box-shadow:0 4px 24px rgba(0,0,0,0.08); }
  .header { background:linear-gradient(135deg,#1D1A16,#3A352F); padding:28px 40px; text-align:center; }
  .header h1 { color:#fff; margin:0; font-size:22px; font-weight:700; }
  .body { padding:32px 40px; }
  .info-box { background:#f8f6f3; border-left:4px solid #C41E3A; border-radius:8px; padding:20px 24px; margin:16px 0; }
  .info-row { display:flex; justify-content:space-between; padding:6px 0; border-bottom:1px solid #e8e3dc; font-size:14px; }
  .info-row:last-child { border-bottom:none; }
  .info-row .label { color:#9b9488; }
  .info-row .value { font-weight:600; color:#1d1a16; }
  .footer { background:#f1ede8; padding:16px 40px; text-align:center; font-size:12px; color:#9b9488; }
</style></head>
<body><div class="wrap">
  <div class="header"><h1>Neue Anmeldung eingegangen</h1></div>
  <div class="body">
    <p style="color:#3a352f">Eine neue Kursanmeldung wurde soeben übermittelt:</p>
    <div class="info-box">
      <div class="info-row"><span class="label">Name</span><span class="value">${anmeldung.vorname} ${anmeldung.nachname}</span></div>
      <div class="info-row"><span class="label">E-Mail</span><span class="value">${anmeldung.email}</span></div>
      <div class="info-row"><span class="label">Telefon</span><span class="value">${anmeldung.telefon || '—'}</span></div>
      <div class="info-row"><span class="label">Adresse</span><span class="value">${anmeldung.strasse}, ${anmeldung.plz_ort}</span></div>
      <div class="info-row"><span class="label">Kurstermin</span><span class="value">${terminText}</span></div>
      <div class="info-row"><span class="label">Personen</span><span class="value">${anmeldung.anzahl_personen}</span></div>
      ${anmeldung.bemerkungen ? `<div class="info-row"><span class="label">Bemerkungen</span><span class="value">${anmeldung.bemerkungen}</span></div>` : ''}
    </div>
  </div>
  <div class="footer">Nothelfer Zentrum Dashboard</div>
</div></body></html>`;
}

async function sendeBestaetigung(anmeldung, termin) {
  const terminText = `${formatDate(termin.datum_von)} – ${formatDate(termin.datum_bis)}, ${termin.standort}`;

  // Bestätigung an Kunde
  await resend.emails.send({
    from:    'Nothelfer Zentrum <onboarding@resend.dev>',
    to:      anmeldung.email,
    subject: 'Ihre Kursanmeldung – Nothelfer Zentrum ✓',
    html:    mailHtmlKunde(anmeldung, terminText),
  });

  // Info an Betreiber
  await resend.emails.send({
    from:    'Nothelfer Zentrum <onboarding@resend.dev>',
    to:      BENACHRICHTIGUNGS_EMPFAENGER,
    subject: `Neue Anmeldung: ${anmeldung.vorname} ${anmeldung.nachname} — ${terminText}`,
    html:    mailHtmlAdmin(anmeldung, terminText),
  });
}

// ─── APP ───────────────────────────────────────────────────────────────────
const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(session({
  secret: config.sessionSecret,
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 8 * 60 * 60 * 1000 }, // 8h
}));

// Statische Dateien (Frontend HTML)
app.use(express.static(path.join(__dirname, 'public')));

// ─── HILFSFUNKTIONEN ───────────────────────────────────────────────────────
function formatDate(str) {
  if (!str) return '';
  const d = new Date(str);
  return d.toLocaleDateString('de-CH', { day:'2-digit', month:'2-digit', year:'numeric' });
}

function requireAuth(req, res, next) {
  if (req.session && req.session.adminId) return next();
  if (req.headers['content-type'] && req.headers['content-type'].includes('application/json')) {
    return res.status(401).json({ error: 'Nicht eingeloggt' });
  }
  res.redirect('/dashboard/login.html');
}

// ─── AUTH ROUTEN ───────────────────────────────────────────────────────────
app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body;
  const user = db.prepare('SELECT * FROM admin_users WHERE username = ?').get(username);
  if (!user || !bcrypt.compareSync(password, user.password)) {
    return res.status(401).json({ error: 'Ungültige Anmeldedaten' });
  }
  req.session.adminId = user.id;
  req.session.adminName = user.username;
  res.json({ ok: true });
});

app.post('/api/auth/logout', (req, res) => {
  req.session.destroy();
  res.json({ ok: true });
});

app.get('/api/auth/me', requireAuth, (req, res) => {
  res.json({ username: req.session.adminName });
});

// ─── KURSTERMINE API ───────────────────────────────────────────────────────

// Alle Termine (public — für das Buchungsformular)
app.get('/api/kurstermine', (req, res) => {
  const termine = db.prepare(`
    SELECT k.*,
      COALESCE((SELECT SUM(a.anzahl_personen) FROM anmeldungen a WHERE a.kurstermin_id = k.id AND a.status != 'storniert'), 0) AS gebuchte_plaetze
    FROM kurstermine k
    WHERE k.aktiv = 1
    ORDER BY k.datum_von ASC
  `).all();
  res.json(termine);
});

// Alle Termine (admin — inkl. inaktive)
app.get('/api/admin/kurstermine', requireAuth, (req, res) => {
  const termine = db.prepare(`
    SELECT k.*,
      COALESCE((SELECT SUM(a.anzahl_personen) FROM anmeldungen a WHERE a.kurstermin_id = k.id AND a.status != 'storniert'), 0) AS gebuchte_plaetze
    FROM kurstermine k
    ORDER BY k.datum_von ASC
  `).all();
  res.json(termine);
});

// Termin anlegen
app.post('/api/admin/kurstermine', requireAuth, (req, res) => {
  const { datum_von, datum_bis, standort, beschreibung, max_plaetze } = req.body;
  if (!datum_von || !datum_bis || !standort) {
    return res.status(400).json({ error: 'datum_von, datum_bis und standort sind Pflichtfelder' });
  }
  const { preis } = req.body;
  const result = db.prepare(`
    INSERT INTO kurstermine (datum_von, datum_bis, standort, beschreibung, max_plaetze, preis)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(datum_von, datum_bis, standort, beschreibung || '', max_plaetze || 20, preis || '');
  res.json({ ok: true, id: result.lastInsertRowid });
});

// Termin bearbeiten
app.put('/api/admin/kurstermine/:id', requireAuth, (req, res) => {
  const { datum_von, datum_bis, standort, beschreibung, max_plaetze, aktiv, preis } = req.body;
  db.prepare(`
    UPDATE kurstermine SET datum_von=?, datum_bis=?, standort=?, beschreibung=?, max_plaetze=?, aktiv=?, preis=?
    WHERE id=?
  `).run(datum_von, datum_bis, standort, beschreibung || '', max_plaetze || 20, aktiv ? 1 : 0, preis || '', req.params.id);
  res.json({ ok: true });
});

// Termin löschen
app.delete('/api/admin/kurstermine/:id', requireAuth, (req, res) => {
  db.prepare('DELETE FROM kurstermine WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

// Termin duplizieren
app.post('/api/admin/kurstermine/:id/duplizieren', requireAuth, (req, res) => {
  const original = db.prepare('SELECT * FROM kurstermine WHERE id = ?').get(req.params.id);
  if (!original) return res.status(404).json({ error: 'Termin nicht gefunden' });
  const result = db.prepare(`
    INSERT INTO kurstermine (datum_von, datum_bis, standort, beschreibung, max_plaetze, aktiv)
    VALUES (?, ?, ?, ?, ?, 1)
  `).run(original.datum_von, original.datum_bis, original.standort, original.beschreibung, original.max_plaetze);
  res.json({ ok: true, id: result.lastInsertRowid });
});

// ─── ANMELDUNGEN API ───────────────────────────────────────────────────────

// Neue Anmeldung (public — vom Frontend-Formular)
app.post('/api/anmeldungen', async (req, res) => {
  const { vorname, nachname, email, telefon, strasse, plz_ort, kurstermin_id, anzahl_personen, bemerkungen } = req.body;

  if (!vorname || !nachname || !email || !strasse || !plz_ort || !kurstermin_id) {
    return res.status(400).json({ error: 'Pflichtfelder fehlen' });
  }

  // Termin prüfen
  const termin = db.prepare('SELECT * FROM kurstermine WHERE id = ? AND aktiv = 1').get(kurstermin_id);
  if (!termin) return res.status(400).json({ error: 'Kurstermin nicht gefunden oder inaktiv' });

  // Plätze prüfen (Summe der Personen, ohne Stornierungen)
  const gebucht = db.prepare("SELECT COALESCE(SUM(anzahl_personen), 0) as c FROM anmeldungen WHERE kurstermin_id = ? AND status != 'storniert'").get(kurstermin_id).c;
  const gewuenscht = parseInt(anzahl_personen) || 1;
  if (gebucht + gewuenscht > termin.max_plaetze) {
    const frei = termin.max_plaetze - gebucht;
    return res.status(400).json({ error: frei <= 0 ? 'Dieser Termin ist leider ausgebucht' : `Nur noch ${frei} Platz/Plätze frei` });
  }

  const result = db.prepare(`
    INSERT INTO anmeldungen (vorname, nachname, email, telefon, strasse, plz_ort, kurstermin_id, anzahl_personen, bemerkungen)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(vorname, nachname, email, telefon || '', strasse, plz_ort, kurstermin_id, anzahl_personen || 1, bemerkungen || '');

  // Sofort antworten — E-Mail wird im Hintergrund gesendet
  res.json({ ok: true, id: result.lastInsertRowid });

  // Bestätigungs-E-Mail asynchron im Hintergrund
  const anmeldung = { vorname, nachname, email, telefon, strasse, plz_ort, anzahl_personen, bemerkungen };
  sendeBestaetigung(anmeldung, termin).catch(err => console.error('E-Mail Fehler:', err.message));
});

// Alle Anmeldungen (admin)
app.get('/api/admin/anmeldungen', requireAuth, (req, res) => {
  const { status, termin_id } = req.query;
  let sql = `
    SELECT a.*, k.datum_von, k.datum_bis, k.standort
    FROM anmeldungen a
    LEFT JOIN kurstermine k ON k.id = a.kurstermin_id
    WHERE 1=1
  `;
  const params = [];
  if (status) { sql += ' AND a.status = ?'; params.push(status); }
  if (termin_id) { sql += ' AND a.kurstermin_id = ?'; params.push(termin_id); }
  sql += ' ORDER BY a.erstellt_am DESC';
  res.json(db.prepare(sql).all(...params));
});

// Anmeldung Status ändern
app.put('/api/admin/anmeldungen/:id/status', requireAuth, (req, res) => {
  const { status } = req.body;
  const allowed = ['neu', 'bestaetigt', 'storniert'];
  if (!allowed.includes(status)) return res.status(400).json({ error: 'Ungültiger Status' });
  db.prepare('UPDATE anmeldungen SET status = ? WHERE id = ?').run(status, req.params.id);
  res.json({ ok: true });
});

// Anmeldung löschen
app.delete('/api/admin/anmeldungen/:id', requireAuth, (req, res) => {
  db.prepare('DELETE FROM anmeldungen WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

// Dashboard-Stats
app.get('/api/admin/stats', requireAuth, (req, res) => {
  const totalAnmeldungen   = db.prepare("SELECT COUNT(*) as c FROM anmeldungen").get().c;
  const neueAnmeldungen    = db.prepare("SELECT COUNT(*) as c FROM anmeldungen WHERE status='neu'").get().c;
  const bestaetigungen     = db.prepare("SELECT COUNT(*) as c FROM anmeldungen WHERE status='bestaetigt'").get().c;
  const aktiveTermine      = db.prepare("SELECT COUNT(*) as c FROM kurstermine WHERE aktiv=1").get().c;
  res.json({ totalAnmeldungen, neueAnmeldungen, bestaetigungen, aktiveTermine });
});

// Passwort ändern
app.post('/api/admin/passwort', requireAuth, (req, res) => {
  const { altes_passwort, neues_passwort } = req.body;
  const user = db.prepare('SELECT * FROM admin_users WHERE id = ?').get(req.session.adminId);
  if (!bcrypt.compareSync(altes_passwort, user.password)) {
    return res.status(400).json({ error: 'Altes Passwort falsch' });
  }
  const hash = bcrypt.hashSync(neues_passwort, 10);
  db.prepare('UPDATE admin_users SET password = ? WHERE id = ?').run(hash, req.session.adminId);
  res.json({ ok: true });
});

// ─── DASHBOARD ROUTEN ──────────────────────────────────────────────────────
app.get('/dashboard', requireAuth, (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'dashboard', 'index.html'));
});

app.get('/dashboard/:file', (req, res, next) => {
  // Login-Seite immer erlauben
  if (req.path === '/dashboard/login.html') return next();
  requireAuth(req, res, next);
}, (req, res) => {
  const file = req.path.replace('/dashboard/', '');
  res.sendFile(path.join(__dirname, 'public', 'dashboard', file));
});

// ─── START ─────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || config.port || 3000;
app.listen(PORT, () => {
  console.log(`
  ╔══════════════════════════════════════════════╗
  ║   Nothelfer Zentrum Backend läuft             ║
  ║   → http://localhost:${PORT}                    ║
  ║   → Dashboard: http://localhost:${PORT}/dashboard ║
  ╚══════════════════════════════════════════════╝
  `);
});
