<div align="center">

# 🧵 Commonthread

**A high-performance, serverless media hosting platform built on Cloudflare Pages/Workers, backed by Telegram Cloud Storage and Cloudflare D1.**

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg?style=for-the-badge)](LICENSE)
[![Cloudflare Pages](https://img.shields.io/badge/Cloudflare-Pages%20%26%20Workers-F38020?style=for-the-badge&logo=cloudflare&logoColor=white)](https://pages.cloudflare.com/)
[![Cloudflare D1](https://img.shields.io/badge/Database-Cloudflare%20D1-F38020?style=for-the-badge&logo=sqlite&logoColor=white)](https://developers.cloudflare.com/d1/)
[![Telegram Bot API](https://img.shields.io/badge/Storage-Telegram%20Bot%20API-26A5E4?style=for-the-badge&logo=telegram&logoColor=white)](https://core.telegram.org/bots/api)

<br/>

[**Live Site**](https://media.dhyey.cc/) • [**API Documentation**](https://media.dhyey.cc/docs) • [**Telegram Bot**](https://t.me/Imagehostssbot) • [**Deployment Guide**](#-deployment-guide) • [**API Reference**](#-api-reference)

</div>

---

## 📖 Overview

**Commonthread** turns Telegram into an unlimited, zero-cost cloud storage backend for your web applications, bots, and personal media hosting. Powered by **Cloudflare Workers / Pages** at the edge and **Cloudflare D1 (Serverless SQLite)** for metadata indexing, Commonthread delivers lightning-fast uploads, edge-cached media streaming, and an administrative management dashboard.

Users can upload media directly via the web interface, the REST API, or simply by sending files to **[@Imagehostssbot](https://t.me/Imagehostssbot)** on Telegram.

---

## 🏗️ Architecture

1. **Web Upload**: Media uploaded via the Web UI or REST API is sent to a private Telegram channel via the Bot API. The (url, fileId, filename) mapping is stored in Cloudflare D1.
2. **Bot Upload**: Users send media to @Imagehostssbot. The webhook forwards the file to the storage channel, records it in D1, and replies with the CDN URL.
3. **Retrieval**: Requests to /<timestamp>.<ext> query D1, stream the file from Telegram, apply security headers, and cache at the Cloudflare edge.

---

## ✨ Features

- ⚡ **Zero-Cost Serverless Hosting**: Runs on Cloudflare Pages/Workers free tier with Telegram as the storage backend.
- 📁 **Broad Format Support**: Images (.png, .jpg, .jpeg, .gif, .webp, .svg, .bmp), videos (.mp4, .mov, .avi, .webm, .mkv), audio (.mp3, .wav), documents (.pdf, .txt, .json, .csv), and stickers.
- 🤖 **Telegram Bot (@Imagehostssbot)**: Users send any media → bot replies with a permanent CDN link. Supports photos, videos, documents, audio, voice, GIFs, stickers.
- 🌐 **Dual Upload Endpoints**: Direct multipart uploads (POST /upload) and remote URL ingestion (GET /hosturl?url=...).
- 🚀 **Global Edge Caching**: Cloudflare Cache API for instant global media delivery.
- 🎨 **Modern Web Interface**: Glassmorphic dark/light mode UI, drag-and-drop upload, QR code generation, upload history.
- 🛡️ **Protected Admin Gallery (/admin)**: HTTP Basic Auth, infinite scroll, batch deletion with cache invalidation.
- 🔒 **Security Hardened**: Executable files served as attachments to prevent XSS.
- 📚 **Built-in API Docs** at /docs.

---

## 🗂️ Project Structure

```
commonthread/
├── _worker.js             # Core Cloudflare Pages / Worker script
├── wrangler.toml.example  # Wrangler CLI config template
├── LICENSE                # MIT License
└── README.md              # Documentation
```

---

## 🚀 Deployment Guide

### Prerequisites

1. A [Cloudflare Account](https://dash.cloudflare.com/) (free tier).
2. **@Imagehostssbot** token (already obtained).
3. A private **Telegram Storage Channel** with @Imagehostssbot as Administrator.

---

### Step 1: Create Cloudflare D1 Database

Cloudflare Dashboard → **Storage & Databases** → **D1 SQL Database** → **Create** → name it `commonthread_db`.

Open the Console tab and run:

```sql
CREATE TABLE IF NOT EXISTS media (
  url TEXT PRIMARY KEY,
  fileId TEXT NOT NULL,
  filename TEXT
);
```

---

### Step 2: Deploy to Cloudflare Pages

1. Push this repository to GitHub.
2. Cloudflare Dashboard → **Workers & Pages** → **Create** → **Pages** → **Connect to Git**.
3. Select your repo. Build settings: Framework = None, Build command = blank, Output = `/`.
4. Click **Save and Deploy**.

---

### Step 3: Add Custom Domain `media.dhyey.cc`

Pages project → **Custom domains** → **Set up a custom domain** → enter `media.dhyey.cc`.

---

### Step 4: Bind D1 & Set Environment Variables

**D1 Binding** (Settings → Functions → D1 database bindings):
- Variable name: `DATABASE` → select `commonthread_db`

**Environment Variables** (Settings → Environment variables → Production):

| Variable | Required | Value |
| :--- | :---: | :--- |
| `DOMAIN` | **Yes** | `media.dhyey.cc` |
| `TG_BOT_TOKEN` | **Yes** | `8697778513:AAFSOAjD_-7urYb5cGGgfL2a037ge0wnb4w` |
| `TG_CHAT_ID` | **Yes** | Your channel ID (e.g. `-1001234567890`) |
| `USERNAME` | **Yes** | Admin panel username |
| `PASSWORD` | **Yes** | Admin panel password |
| `ENABLE_AUTH` | No | `false` |
| `MAX_SIZE_MB` | No | `50` |

Trigger a **Retry deployment** to apply bindings.

---

### Step 5: Activate the Telegram Webhook

Visit this URL once after deploy (in browser):

```
https://media.dhyey.cc/set-webhook?secret=8697778513:AAFSOAjD_-7urYb5cGGgfL2a037ge0wnb4w
```

Expected response:
```json
{ "webhook": "https://media.dhyey.cc/telegram", "telegram": { "ok": true } }
```

**@Imagehostssbot is now live.** Send it any file to test.

---

## 📡 API Reference

### POST /upload — Direct File Upload

```bash
curl -X POST https://media.dhyey.cc/upload -F "file=@image.png"
```

### GET /hosturl — Remote URL Upload

```bash
curl "https://media.dhyey.cc/hosturl?url=https://example.com/photo.jpg"
```

### GET /<timestamp>.<ext> — Retrieve Media

Streams file with correct Content-Type and edge caching.

### GET /admin/api/media — Paginated Media List (Admin)

```
Authorization: Basic <base64(username:password)>
```

### POST /delete-images — Batch Delete (Admin)

```bash
curl -X POST https://media.dhyey.cc/delete-images \
  -u "admin:password" -H "Content-Type: application/json" \
  -d '["https://media.dhyey.cc/1234567890.png"]'
```

---

## 🤖 Telegram Bot

**[@Imagehostssbot](https://t.me/Imagehostssbot)** — send any media file and receive a permanent `media.dhyey.cc` CDN link.

Supported: photos, videos, documents, audio, voice messages, GIFs, stickers.

Commands: `/start`, `/help`

---

## 📄 License

This project is open source and available under the [MIT License](LICENSE).

---

## ⚠️ Disclaimer

Commonthread is an independent, open-source project for personal and educational media hosting. Not affiliated with Telegram or Cloudflare. Users are responsible for compliance with applicable laws and terms of service.