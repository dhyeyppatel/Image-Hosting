<div align="center">

# 🚀 CommonThread

**A high-performance, serverless universal media hosting platform & developer API built on Cloudflare Pages/Workers, backed by Telegram Cloud Storage, Cloudflare R2, and Cloudflare D1.**

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg?style=for-the-badge)](LICENSE)
[![Cloudflare Pages](https://img.shields.io/badge/Cloudflare-Pages%20%26%20Workers-F38020?style=for-the-badge&logo=cloudflare&logoColor=white)](https://pages.cloudflare.com/)
[![Cloudflare D1](https://img.shields.io/badge/Database-Cloudflare%20D1-F38020?style=for-the-badge&logo=sqlite&logoColor=white)](https://developers.cloudflare.com/d1/)
[![Cloudflare R2](https://img.shields.io/badge/Object%20Storage-Cloudflare%20R2-F38020?style=for-the-badge&logo=cloudflare&logoColor=white)](https://developers.cloudflare.com/r2/)
[![Telegram Bot API](https://img.shields.io/badge/Storage-Telegram%20Bot%20API-26A5E4?style=for-the-badge&logo=telegram&logoColor=white)](https://core.telegram.org/bots/api)

<br/>

[**Web Uploader**](https://media-hosting.dhyeyp254.workers.dev/) • [**Pricing & Plans**](https://media-hosting.dhyeyp254.workers.dev/pricing) • [**Developer API Docs**](https://media-hosting.dhyeyp254.workers.dev/docs) • [**ShareX Config**](https://media-hosting.dhyeyp254.workers.dev/api/sharex) • [**Telegram Bot**](https://t.me/Imagehostssbot) • [**Deployment Guide**](#-deployment-guide) • [**API Reference**](#-developer-api-reference)

</div>

---

## 📖 Overview

**CommonThread** is an ultra-fast, serverless file and media hosting service equipped with a production-ready **Developer REST API**. It is built for developers who need to integrate high-speed file hosting directly into their own applications, mobile apps, websites, Discord/Telegram bots, or automation scripts.

CommonThread supports **any file format** (Images, Videos, Audio, PDFs, `.txt`, `.bat`, `.sh`, `.zip`, binaries, and documents) with native range streaming, global edge caching, and zero egress fees.

### 🌟 Key Highlights

- **Universal Format Support**: Host images, audio, video, documents, scripts, archives, and binaries without arbitrary MIME-type restrictions.
- **Smart Cost-Optimized Storage**:
  - Files $\le$ 20 MB are uploaded directly to **Telegram Cloud Storage** ($0 cost, high-speed CDN, unlimited storage).
  - Files $>$ 20 MB (Premium Tier) are routed to **Cloudflare R2 Object Storage** (S3-compatible, zero egress fees).
- **Rich Telegram Metadata Captions**: Every file archived in Telegram includes an HTML caption with full metadata (filename, exact size, MIME type, upload source, auth tier, UTC & IST timestamps, direct link, slug ID, and delete token).
- **ImgBB API Compatibility**: Drop-in replacement endpoint (`POST /api/1/upload`) compatible with existing third-party uploaders, plugins, and ShareX.
- **Built-in Developer Token Management**: Generate, monitor, and instantly toggle API keys between **Free (20MB)** and **Premium (500MB)** directly from the `/admin` dashboard.
- **Security-First Architecture**: Anti-XSS attachment enforcement for executable scripts (`.bat`, `.sh`, `.exe`, `.html`, `.svg`), SSRF protection against private IP probing, and strict memory limits.

---

## 🏗️ Architecture

```mermaid
flowchart TD
    Client([👤 Client: App / Web / Script / Bot / ShareX]) -->|HTTP POST Request| CF[⚡ Cloudflare Worker / Pages Edge]
    
    subgraph Routing & Auth
        CF --> Auth{Validate Token / Size}
        Auth -->|Size <= 20MB| TGRoute[📦 Telegram Path]
        Auth -->|Size > 20MB & Premium| R2Route[🪣 Cloudflare R2 Path]
    end

    TGRoute -->|sendDocument + Rich HTML Caption| TG[☁️ Telegram Storage Channel]
    R2Route -->|R2 PutObject| R2[(🗄️ Cloudflare R2 Bucket)]

    CF -->|Save Metadata & Slugs| D1[(🗄️ Cloudflare D1 Database)]
    CF -->|Cache Media at Edge| Cache[(🚀 Cloudflare Global CDN)]

    ClientWeb([🌐 Telegram App User]) -->|Upload File| Bot[🤖 Telegram Bot Webhook (Vercel)]
    Bot -->|Forward & Register| CF
```

---

## ✨ Feature Comparison

| Feature | ⚡ Free Tier | 👑 Developer Pro (Premium) | 🏢 Enterprise |
| :--- | :--- | :--- | :--- |
| **Price** | **$0 / forever** | **$9 / month** | **$29 / month** |
| **Max Single File Size** | **20 MB** | **500 MB** | **2 GB+** |
| **Storage Backend** | Telegram Cloud Storage | **Telegram** (&le; 20MB) & **Cloudflare R2** (&gt; 20MB) | Dedicated Cloudflare R2 Bucket |
| **Bandwidth / Egress** | Unlimited ($0) | Unlimited ($0) | Unlimited ($0) |
| **Seeking / Streaming** | Standard HTTP Range | High-Speed Native Edge Streaming | Dedicated Edge Route |
| **Rich Metadata Caption** | Included | Included | Included |
| **Token Prefix** | `ct_dev_...` | Priority `ct_dev_...` | Multi-token RBAC |
| **How to Request** | Instant via `/admin` | [Request via Email](mailto:dhyeyhosts@gmail.com) | [Contact Sales](mailto:dhyeyhosts@gmail.com) |

*Full interactive feature matrix available at [`/pricing`](https://media-hosting.dhyeyp254.workers.dev/pricing).*

---

## 📡 Developer API Reference

### 1. Upload Any File (`POST /api/upload`)

Standard multipart upload endpoint for developers and applications.

- **URL**: `https://<YOUR_DOMAIN>/api/upload`
- **Method**: `POST`
- **Authentication** *(any of the following)*:
  - Header: `X-API-Key: ct_dev_...`
  - Header: `Authorization: Bearer ct_dev_...`
  - Query parameter: `?key=ct_dev_...`
  - Form field: `key=ct_dev_...`

#### Parameters

| Field | Type | Description |
| :--- | :--- | :--- |
| `file` | `File` (Binary) | The file to upload (Image, PDF, Video, Audio, Script, Archive, etc.). |
| `url` | `String` *(optional)* | Remote URL to mirror/ingest directly into hosting. |

#### Example Response (`200 OK`)
```json
{
  "success": true,
  "url": "https://media-hosting.dhyeyp254.workers.dev/1794851338016_im104h.pdf",
  "filename": "document.pdf",
  "size": 1048576,
  "size_formatted": "1.00 MB",
  "mime_type": "application/pdf",
  "uploaded_at": "2026-11-16T17:48:00.000Z",
  "delete_token": "del_a1b2c3d4e5f6..."
}
```

---

### 2. ImgBB Compatible Endpoint (`POST /api/1/upload`)

Drop-in replacement for software that integrates with ImgBB (such as **ShareX**, mobile apps, or CMS plugins).

- **URL**: `https://<YOUR_DOMAIN>/api/1/upload`
- **Method**: `POST`
- **Parameters**:
  - `key`: Developer API token.
  - `image`: Binary file or Base64-encoded string.

#### Example Response (`200 OK`)
```json
{
  "data": {
    "id": "1794851338016_im104h",
    "title": "photo.png",
    "url_viewer": "https://media-hosting.dhyeyp254.workers.dev/1794851338016_im104h.png",
    "url": "https://media-hosting.dhyeyp254.workers.dev/1794851338016_im104h.png",
    "display_url": "https://media-hosting.dhyeyp254.workers.dev/1794851338016_im104h.png",
    "size": 245760,
    "time": 1794851338,
    "image": {
      "filename": "photo.png",
      "name": "photo.png",
      "mime": "image/png",
      "extension": "png",
      "url": "https://media-hosting.dhyeyp254.workers.dev/1794851338016_im104h.png"
    },
    "delete_url": "https://media-hosting.dhyeyp254.workers.dev/delete/del_a1b2c3d4e5f6..."
  },
  "success": true,
  "status": 200
}
```

---

### 3. One-Click ShareX Integration (`GET /api/sharex`)

Visit `https://<YOUR_DOMAIN>/api/sharex` to download a pre-configured `.sxcu` destination file. Double-click to import it into ShareX for instant screenshot and screen-recording uploads.

---

## 💻 Code Examples

### Python (`requests`)
```python
import requests

API_URL = "https://media-hosting.dhyeyp254.workers.dev/api/upload"
API_KEY = "ct_dev_YOUR_TOKEN_HERE"

# Upload any file: .png, .pdf, .bat, .mp4, etc.
with open("report.pdf", "rb") as f:
    response = requests.post(
        API_URL,
        headers={"X-API-Key": API_KEY},
        files={"file": f}
    )

data = response.json()
if data.get("success"):
    print("Direct File URL:", data["url"])
else:
    print("Upload error:", data.get("error"))
```

### JavaScript / Node.js (`fetch`)
```javascript
const fs = require('fs');
const blob = new Blob([fs.readFileSync('my_file.zip')]);
const formData = new FormData();
formData.append('file', blob, 'my_file.zip');

const res = await fetch('https://media-hosting.dhyeyp254.workers.dev/api/upload', {
  method: 'POST',
  headers: {
    'X-API-Key': 'ct_dev_YOUR_TOKEN_HERE'
  },
  body: formData
});

const data = await res.json();
console.log('Direct URL:', data.url);
```

### cURL
```bash
curl -X POST https://media-hosting.dhyeyp254.workers.dev/api/upload \
  -H "X-API-Key: ct_dev_YOUR_TOKEN_HERE" \
  -F "file=@/path/to/any_file.pdf"
```

### Go
```go
package main

import (
	"bytes"
	"fmt"
	"io"
	"mime/multipart"
	"net/http"
	"os"
)

func main() {
	file, _ := os.Open("archive.zip")
	defer file.Close()

	body := &bytes.Buffer{}
	writer := multipart.NewWriter(body)
	part, _ := writer.CreateFormFile("file", "archive.zip")
	io.Copy(part, file)
	writer.Close()

	req, _ := http.NewRequest("POST", "https://media-hosting.dhyeyp254.workers.dev/api/upload", body)
	req.Header.Set("Content-Type", writer.FormDataContentType())
	req.Header.Set("X-API-Key", "ct_dev_YOUR_TOKEN_HERE")

	client := &http.Client{}
	resp, _ := client.Do(req)
	defer resp.Body.Close()

	respBody, _ := io.ReadAll(resp.Body)
	fmt.Println(string(respBody))
}
```

---

## 🔑 Admin Dashboard & Token Management

Navigate to `https://<YOUR_DOMAIN>/admin` and log in with your credentials.

### Features
1. **Media Gallery**:
   - Preview all hosted images and video clips.
   - Batch deletion with multi-select.
   - One-click BBCode, Markdown, and Direct Link copying.
2. **Developer API Tokens Tab**:
   - **Issue New Tokens**: Set custom application name and initial tier (Free or Premium).
   - **One-Click Tier Toggle**: Click the tier badge on any token to instantly convert it between **Free (20MB)** and **Premium (500MB)**.
   - **Token Revocation**: Disable compromised tokens immediately.
   - **Upload Counter**: Track lifetime uploads made with each token.

---

## ⚙️ Environment Variables Reference

### Cloudflare Worker / Pages Environment

Configure these in the Cloudflare Dashboard under **Workers & Pages > Settings > Variables and Secrets**:

| Variable | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `DATABASE` | D1 Binding | **Yes** | Cloudflare D1 Database binding named `DATABASE`. |
| `TG_BOT_TOKEN` | Secret | **Yes** | Telegram Bot Token obtained from [@BotFather](https://t.me/BotFather). |
| `TG_CHAT_ID` | Secret | **Yes** | Telegram Private Channel / Group ID used for storage backup. |
| `USERNAME` | Variable | **Yes** | Admin dashboard username (default: `admin`). |
| `PASSWORD` | Secret | **Yes** | Admin dashboard password. |
| `DOMAIN` | Variable | Optional | Public domain (e.g. `media-hosting.dhyeyp254.workers.dev`). |
| `R2_BUCKET` | R2 Binding | Optional | Cloudflare R2 bucket binding named `R2_BUCKET` for files $> 20$MB. |
| `API_KEY` | Secret | Optional | Legacy global API key (if set, unauthenticated uploads are blocked). |

### Vercel Environment (Telegram Bot Webhook)

Configure these in the Vercel Dashboard under **Project Settings > Environment Variables**:

| Variable | Required | Description |
| :--- | :--- | :--- |
| `TG_BOT_TOKEN` | **Yes** | Telegram Bot Token from [@BotFather](https://t.me/BotFather). |
| `TG_CHAT_ID` | **Yes** | Telegram Channel ID for file archive storage. |
| `CF_DOMAIN` | **Yes** | Cloudflare Worker domain (e.g. `media-hosting.dhyeyp254.workers.dev`). |
| `CF_USERNAME` | **Yes** | Worker admin username (e.g. `admin`). |
| `CF_PASSWORD` | **Yes** | Worker admin password. |
| `CF_API_KEY` | Optional | Developer token `ct_dev_...` to use for bot uploads. |

---

## 🚀 Deployment Guide

### 1. Cloudflare Setup (Core Worker & D1 Database)

1. **Create D1 Database**:
   - In Cloudflare Dashboard, go to **Storage & Databases > D1**.
   - Create a database named `ar_hosting_db`.
   - Open the **Console** tab and run the schema setup:
     ```sql
     CREATE TABLE IF NOT EXISTS media (
       url TEXT PRIMARY KEY,
       fileId TEXT NOT NULL,
       filename TEXT,
       file_size INTEGER DEFAULT 0,
       mime_type TEXT DEFAULT '',
       created_at INTEGER DEFAULT 0,
       delete_token TEXT DEFAULT ''
     );

     CREATE TABLE IF NOT EXISTS api_keys (
       key TEXT PRIMARY KEY,
       name TEXT,
       created_at INTEGER,
       active INTEGER DEFAULT 1,
       uploads_count INTEGER DEFAULT 0,
       is_premium INTEGER DEFAULT 0,
       max_size_mb INTEGER DEFAULT 20
     );
     ```
2. **Deploy Worker**:
   - Push this repository to GitHub.
   - In Cloudflare Workers, deploy the worker with `_worker.js`.
   - In **Settings > Bindings**, bind your D1 database to the variable name **`DATABASE`**.
   - *(Optional for Premium)*: In **Settings > Bindings**, bind an R2 Bucket to the variable name **`R2_BUCKET`**.
   - Add the required environment variables (`TG_BOT_TOKEN`, `TG_CHAT_ID`, `USERNAME`, `PASSWORD`).

### 2. Vercel Setup (Telegram Bot Webhook)

1. Connect this repository to Vercel (uses `api/index.py`).
2. Add the environment variables: `TG_BOT_TOKEN`, `TG_CHAT_ID`, `CF_DOMAIN`, `CF_USERNAME`, `CF_PASSWORD`.
3. Set your Telegram webhook:
   ```bash
   curl -F "url=https://<YOUR-VERCEL-APP>.vercel.app/webhook" https://api.telegram.org/bot<YOUR_TG_BOT_TOKEN>/setWebhook
   ```
4. Now, any file or image sent to [@Imagehostssbot](https://t.me/Imagehostssbot) is automatically hosted on Cloudflare with a direct URL returned in chat!

---

## ✉️ Contact & Support

For questions, enterprise plans, or to request a Developer API key:
- **Email**: [dhyeyhosts@gmail.com](mailto:dhyeyhosts@gmail.com)
- **Request Key Portal**: [https://media-hosting.dhyeyp254.workers.dev/request-api](https://media-hosting.dhyeyp254.workers.dev/request-api)
- **Enterprise Inquiry**: [https://media-hosting.dhyeyp254.workers.dev/contact](https://media-hosting.dhyeyp254.workers.dev/contact)

---

## 📄 License

This project is licensed under the [MIT License](LICENSE).
