/**
 * ══════════════════════════════════════════
 *  KONFIGURATION — HIER ANPASSEN
 *  WICHTIG: config.js ist in .gitignore —
 *  niemals ins Git-Repository einchecken!
 * ══════════════════════════════════════════
 */

module.exports = {

  // Server Port
  port: 3000,

  // Session Secret
  sessionSecret: process.env.SESSION_SECRET || 'nothelfer-secret-2026',

  // Standard Admin-Login (wird beim ersten Start erstellt)
  admin: {
    username: process.env.ADMIN_USERNAME || 'admin',
    password: process.env.ADMIN_PASSWORD || 'admin1234',
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
