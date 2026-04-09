/**
 * ══════════════════════════════════════════
 *  KONFIGURATION — HIER ANPASSEN
 * ══════════════════════════════════════════
 */
module.exports = {

  // Server Port
  port: 3000,

  // Session Secret — wird aus Umgebungsvariable gelesen (Railway/Server)
  sessionSecret: process.env.SESSION_SECRET || 'nothelfer-secret-2026-bitte-aendern',

  // Standard Admin-Login (wird beim ersten Start erstellt)
  // Danach Passwort im Dashboard ändern
  admin: {
    username: 'admin',
    password: 'admin1234',
  },

  // ── SMTP ─────────────────────────────────
  // Trage hier deine SMTP-Daten ein:
  smtp: {
    host:         'asmtp.mail.hostpoint.ch',       // z.B. mail.your-server.de
    port:         465,                       // 587 (TLS) oder 465 (SSL)
    secure:       true,                     // true für Port 465
    user:         'info@nothelferzentrum.ch',
    pass:         process.env.SMTP_PASS || 'Nothelferzentrum123?',
    absenderName: 'Nothelfer Zentrum',
  }

};
