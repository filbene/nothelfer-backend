/**
 * ══════════════════════════════════════════
 *  KONFIGURATION — HIER ANPASSEN
 *  WICHTIG: config.js ist in .gitignore —
 *  niemals ins Git-Repository einchecken!
 * ══════════════════════════════════════════
 */

// Pflicht-Umgebungsvariablen prüfen
const required = ['SESSION_SECRET', 'ADMIN_PASSWORD'];
const missing = required.filter(k => !process.env[k]);
if (missing.length) {
  console.error(`[FEHLER] Fehlende Umgebungsvariablen: ${missing.join(', ')}`);
  console.error('Bitte .env-Datei anlegen oder Railway-Variablen setzen.');
  process.exit(1);
}

module.exports = {

  // Server Port
  port: 3000,

  // Session Secret — muss als Umgebungsvariable gesetzt sein
  sessionSecret: process.env.SESSION_SECRET,

  // Standard Admin-Login (wird beim ersten Start erstellt)
  // Passwort über ADMIN_PASSWORD Umgebungsvariable setzen
  admin: {
    username: process.env.ADMIN_USERNAME || 'admin',
    password: process.env.ADMIN_PASSWORD,
  },

  // ── SMTP ─────────────────────────────────
  smtp: {
    host:         'asmtp.mail.hostpoint.ch',
    port:         587,
    secure:       false,
    user:         'info@nothelferzentrum.ch',
    pass:         process.env.SMTP_PASS || '',
    absenderName: 'Nothelfer Zentrum',
  }

};
