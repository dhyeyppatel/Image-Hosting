# 🚀 Dhyey Space — Telegram-Powered Image Hosting

> A production-ready, open-source image hosting platform built with **FastAPI**, **MongoDB Atlas**, and **Telegram** as the storage backend.

**Live demo:** [https://image.dhyey.space](https://eligible-kissie-dhyey-bd978350.koyeb.app/)

---

## ✨ Features

| Feature | Description |
|---|---|
| 📸 Upload images | JPG, PNG, WEBP, GIF — up to 20 MB |
| 🔗 Human-readable URLs | `dhyey.space/i/silent-bucket` |
| 🌐 Direct image links | `dhyey.space/img/silent-bucket` |
| ⬇️ Download | Original filename preserved |
| 👁️ View counter | Atomic view tracking in MongoDB |
| 🔒 Secure storage | Bot token never exposed |
| 📱 OpenGraph + Twitter Cards | Discord, Slack, Twitter unfurls |
| 🌙 Dark / Light mode | Auto-detects system preference |
| 📋 Copy buttons | Page link, direct link, HTML, Markdown |
| 🚦 Rate limiting | Per-IP upload throttling |
| 🏥 Health check | `/health` for Koyeb monitoring |

---

## 🗂️ Project Structure

```
dhyey-space/
├── app/
│   ├── __init__.py
│   ├── main.py              # FastAPI entry point
│   ├── config.py            # Pydantic settings
│   ├── database.py          # MongoDB connection
│   ├── models.py            # Pydantic data models
│   ├── telegram_storage.py  # Telegram Bot API integration
│   ├── slug_generator.py    # Adjective-noun slug generator
│   ├── routes/
│   │   ├── health.py        # GET /health
│   │   ├── pages.py         # GET / and GET /i/{slug}
│   │   ├── upload.py        # POST /upload
│   │   └── images.py        # GET /img/{slug} and /download/{slug}
│   ├── services/
│   │   └── image_service.py # Business logic layer
│   └── utils/
│       └── file_validation.py # MIME detection, sanitization
├── templates/
│   ├── home.html
│   ├── image.html
│   └── 404.html
├── static/
│   ├── css/style.css
│   └── js/
│       ├── upload.js
│       └── image.js
├── wordlists/
│   ├── adjectives.txt       # ~200 adjectives
│   └── nouns.txt            # ~300 nouns
├── requirements.txt
├── Procfile
├── runtime.txt
└── .env.example
```

---

## 🛠️ Prerequisites

- Python 3.11+
- A **MongoDB Atlas** free tier cluster
- A **Telegram Bot** (via @BotFather)
- A **private Telegram channel** with the bot as administrator

---

## 📦 Setup — Step by Step

### 1. Clone the Repository

```bash
git clone https://github.com/yourusername/dhyey-space.git
cd dhyey-space
```

### 2. Create a Virtual Environment

```bash
python -m venv venv
source venv/bin/activate       # Linux/macOS
venv\Scripts\activate          # Windows
```

### 3. Install Dependencies

```bash
pip install -r requirements.txt
```

### 4. Configure Environment Variables

```bash
cp .env.example .env
# Edit .env with your actual credentials
```

---

## 🤖 Telegram Bot Setup

### Step 1 — Create the Bot

1. Open Telegram and search for **@BotFather**
2. Send `/newbot`
3. Follow the prompts to name your bot
4. Copy the **bot token** — this is your `BOT_TOKEN`

### Step 2 — Create the Storage Channel

1. Create a **private Telegram channel**
2. Add your bot as a **channel administrator** with permission to post messages
3. Get the channel ID:
   - Forward any message from the channel to **@userinfobot**
   - The channel ID will look like `-1001234567890`
   - This is your `STORAGE_CHANNEL_ID`

---

## 🍃 MongoDB Atlas Setup

### Step 1 — Create a Cluster

1. Go to [MongoDB Atlas](https://www.mongodb.com/atlas)
2. Create a free **M0 Shared** cluster
3. Create a database user with read/write access
4. Whitelist **0.0.0.0/0** (all IPs) for Koyeb

### Step 2 — Get Connection String

1. Click **Connect → Drivers**
2. Copy the connection string
3. Replace `<password>` with your database user's password
4. This is your `MONGO_URI`

The database (`dhyey_space`) and collection (`images`) are created automatically on first run.

---

## 🔐 Environment Variables Reference

| Variable | Required | Default | Description |
|---|---|---|---|
| `MONGO_URI` | ✅ | — | MongoDB Atlas connection string |
| `BOT_TOKEN` | ✅ | — | Telegram bot token from @BotFather |
| `STORAGE_CHANNEL_ID` | ✅ | — | Private channel ID (negative integer) |
| `BASE_URL` | ✅ | `https://dhyey.space` | Public URL of your deployment |
| `SECRET_KEY` | ✅ | — | Random string for internal signing |
| `MAX_UPLOAD_SIZE_MB` | ❌ | `20` | Maximum file size in MB |
| `RATE_LIMIT_UPLOADS_PER_MINUTE` | ❌ | `10` | Per-IP upload rate limit |
| `LOG_LEVEL` | ❌ | `INFO` | Logging level |

---

## 🚀 Local Development

```bash
uvicorn app.main:app --reload --port 8000
```

Open: http://localhost:8000

> **Note:** Set `BASE_URL=http://localhost:8000` in your `.env` for correct URL generation locally.

---

## ☁️ Koyeb Deployment

### Step 1 — Push to GitHub

```bash
git add .
git commit -m "Initial commit"
git push origin main
```

### Step 2 — Create a Koyeb App

1. Go to [Koyeb Dashboard](https://app.koyeb.com)
2. Click **Create App → GitHub**
3. Select your repository

### Step 3 — Configure the Service

| Setting | Value |
|---|---|
| **Build command** | `pip install -r requirements.txt` |
| **Run command** | `uvicorn app.main:app --host 0.0.0.0 --port $PORT` |
| **Port** | `8000` |
| **Health check path** | `/health` |

### Step 4 — Add Environment Variables

In the Koyeb dashboard, add all variables from `.env.example`:

- `MONGO_URI`
- `BOT_TOKEN`
- `STORAGE_CHANNEL_ID`
- `BASE_URL` (your Koyeb/custom domain URL)
- `SECRET_KEY`
- `MAX_UPLOAD_SIZE_MB`

### Step 5 — Custom Domain

1. In Koyeb, go to **Domains → Add Domain**
2. Add `dhyey.space` and `www.dhyey.space`
3. Set DNS records as instructed by Koyeb

---

## 📡 API Reference

### `POST /upload`

Upload an image.

**Form data:** `file` (multipart)

**Response:**
```json
{
  "success": true,
  "slug": "silent-bucket",
  "page_url": "https://dhyey.space/i/silent-bucket",
  "direct_url": "https://dhyey.space/img/silent-bucket"
}
```

**Error codes:**
- `400` — Validation error (unsupported type, empty file)
- `413` — File too large
- `429` — Rate limit exceeded
- `500` — Server error

---

### `GET /img/{slug}`

Return raw image bytes. Suitable for:
- HTML `<img src="...">` tags
- Markdown `![](...)` embeds
- Discord / Telegram unfurls

**Headers returned:**
- `Content-Type: image/jpeg` (or appropriate MIME)
- `Cache-Control: public, max-age=31536000, immutable`

---

### `GET /download/{slug}`

Force-download the image with its original filename.

---

### `GET /i/{slug}`

HTML page with image preview, metadata, share links, and copy buttons.

---

### `GET /health`

```json
{"status": "ok"}
```

---

## 🔒 Security Considerations

- **Bot token** is never exposed in responses or logs
- **File type** is validated using magic bytes, not the Content-Type header
- **Filename** is sanitized (path traversal stripped)
- **Upload size** is enforced server-side
- **Security headers** are set on all responses (`X-Content-Type-Options`, `X-Frame-Options`, etc.)
- **Rate limiting** prevents abuse via SlowAPI
- **CORS** is open for image serving (required for cross-origin embeds)

---

## 📊 MongoDB Schema

**Collection:** `images`

```json
{
  "_id": "silent-bucket",
  "file_id": "AgACAgIAAxkBAAIB...",
  "file_unique_id": "AQADx8...",
  "message_id": 42,
  "filename": "photo.jpg",
  "mime_type": "image/jpeg",
  "size": 1048576,
  "views": 17,
  "created_at": "2025-01-01T12:00:00Z"
}
```

**Indexes:**
- `_id` (unique) — slug
- `created_at` (descending) — for future gallery pages
- `file_unique_id` (ascending) — for deduplication

---

## 🤝 Contributing

Pull requests welcome! Please open an issue first for major changes.

---

## 📄 License

MIT © 2025 Dhyey Space
