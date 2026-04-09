# Nothelfer Zentrum — Backend

Node.js + Express + SQLite + Nodemailer

---

## 🚀 Setup (Linux)

### 1. Voraussetzungen
```bash
# Node.js installieren (falls noch nicht vorhanden)
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs
```

### 2. Dependencies installieren
```bash
cd nothelfer-backend
npm install
```

### 3. Konfiguration
Öffne `config.js` und trage deine SMTP-Daten ein:

```js
smtp: {
  host:  'mail.dein-anbieter.ch',
  port:  587,
  secure: false,
  user:  'info@nothelferzentrum.ch',
  pass:  'DEIN_PASSWORT',
  absenderName: 'Nothelfer Zentrum',
},
```

Ändere auch den `sessionSecret` auf einen langen, zufälligen String.

### 4. Server starten
```bash
node server.js
# oder mit Auto-Reload (Node 18+):
node --watch server.js
```

---

## 🌐 URLs

| Seite | URL |
|---|---|
| Frontend (Buchungsseite) | http://localhost:3000 |
| Dashboard Login | http://localhost:3000/dashboard/login.html |
| Dashboard | http://localhost:3000/dashboard |

**Standard-Login:** `admin` / `admin1234`  
→ Bitte nach dem ersten Login im Dashboard unter *Einstellungen* ändern!

---

## 📁 Dateistruktur

```
nothelfer-backend/
├── server.js           ← Hauptserver
├── config.js           ← SMTP, Admin, Port
├── data.db             ← SQLite Datenbank (wird automatisch erstellt)
├── package.json
├── public/
│   ├── index.html      ← Deine Frontend-HTML (hier rein kopieren)
│   └── dashboard/
│       ├── login.html  ← Dashboard Login
│       └── index.html  ← Dashboard
└── README.md
```

---

## 🔌 Frontend verbinden

Die `metin-vip.html` muss angepasst werden:

1. Datei als `public/index.html` speichern
2. Das `<form>` anpassen — statt `formsubmit.co` → eigene API:

```html
<!-- ALT: -->
<form action="https://formsubmit.co/..." method="POST">

<!-- NEU: form-submit via JavaScript (bereits integriert wenn du die angepasste Version verwendest) -->
```

Das Formular sendet per `fetch()` an `/api/anmeldungen`.  
Die Kurstermine werden automatisch vom Backend geladen.

---

## 🔒 Als Service einrichten (systemd)

```bash
sudo nano /etc/systemd/system/nothelfer.service
```

```ini
[Unit]
Description=Nothelfer Zentrum Backend
After=network.target

[Service]
Type=simple
User=www-data
WorkingDirectory=/var/www/nothelfer-backend
ExecStart=/usr/bin/node server.js
Restart=on-failure
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl enable nothelfer
sudo systemctl start nothelfer
sudo systemctl status nothelfer
```

---

## 📡 API Übersicht

### Public (kein Login nötig)
- `GET  /api/kurstermine` — Aktive Termine für Buchungsformular
- `POST /api/anmeldungen` — Neue Anmeldung einreichen

### Admin (Login erforderlich)
- `GET  /api/admin/stats`
- `GET  /api/admin/kurstermine`
- `POST /api/admin/kurstermine`
- `PUT  /api/admin/kurstermine/:id`
- `DELETE /api/admin/kurstermine/:id`
- `GET  /api/admin/anmeldungen`
- `PUT  /api/admin/anmeldungen/:id/status`
- `DELETE /api/admin/anmeldungen/:id`
- `POST /api/admin/passwort`
