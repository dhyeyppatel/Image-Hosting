export default {
  async fetch(request, env) {
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, OPTIONS, DELETE',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-API-Key',
          'Access-Control-Max-Age': '86400',
        }
      });
    }

    try {
      const response = await this.handleRequest(request, env);
      const newResponse = new Response(response.body, response);
      newResponse.headers.set('Access-Control-Allow-Origin', '*');
      return newResponse;
    } catch (err) {
      console.error('Unhandled Worker Exception:', err);
      return new Response(JSON.stringify({ success: false, error: 'Internal Server Error', details: err.message }), {
        status: 500,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
      });
    }
  },

  async handleRequest(request, env) {
    const url = new URL(request.url);
    const pathname = url.pathname;
    const domain = env.DOMAIN || url.host;
    const DATABASE = env.DATABASE;
    const USERNAME = env.USERNAME || 'admin';
    const PASSWORD = env.PASSWORD || 'dhyey';
    const adminPath = 'admin';
    const enableAuth = env.ENABLE_AUTH === 'true';
    const TG_BOT_TOKEN = env.TG_BOT_TOKEN;
    const TG_CHAT_ID = env.TG_CHAT_ID;
    const maxSizeMB = env.MAX_SIZE_MB ? parseInt(env.MAX_SIZE_MB, 10) : 20;
    const maxSize = maxSizeMB * 1024 * 1024;

    // Route: Root / Web Interface
    if (pathname === '/') {
      return await handleRootRequest(request, USERNAME, PASSWORD, enableAuth, domain);
    }

    // Route: Direct redirect for /v/:id to raw file
    if (pathname.startsWith('/v/')) {
      return await handleViewerRedirect(request, DATABASE, domain);
    }

    // PRIMARY ROUTE: Developer API (POST /api/upload)
    if (pathname === '/api/upload') {
      return request.method === 'POST'
        ? await handleDeveloperApiUpload(request, env, domain, TG_BOT_TOKEN, TG_CHAT_ID, maxSize)
        : new Response(JSON.stringify({ success: false, error: 'Method Not Allowed' }), { status: 405, headers: { 'Content-Type': 'application/json' } });
    }

    // Optional ImgBB v1 Drop-in API endpoint (POST /api/1/upload)
    if (pathname === '/api/1/upload') {
      return request.method === 'POST'
        ? await handleImgBBApiUpload(request, env, domain, TG_BOT_TOKEN, TG_CHAT_ID, maxSize)
        : new Response(JSON.stringify({ status_code: 405, error: { message: 'Method Not Allowed' } }), { status: 405, headers: { 'Content-Type': 'application/json' } });
    }

    // Route: ShareX Custom Uploader (.sxcu) Download
    if (pathname === '/api/sharex') {
      return handleShareXConfigRequest(request, domain);
    }

    // Route: File Metadata Info API (GET /api/info?url=...)
    if (pathname === '/api/info') {
      return await handleApiInfoRequest(request, DATABASE, domain);
    }

    // Route: Delete API with delete_token or Admin Auth
    if (pathname === '/api/delete') {
      return await handleApiDeleteRequest(request, DATABASE, USERNAME, PASSWORD);
    }

    // Route: Telegram Bot Media Registration (from Vercel webhook)
    if (pathname === '/api/register') {
      return request.method === 'POST'
        ? await handleApiRegisterRequest(request, env, domain, USERNAME, PASSWORD)
        : new Response('Method Not Allowed', { status: 405 });
    }

    // Route: Form Upload (POST /upload)
    if (pathname === '/upload') {
      return request.method === 'POST'
        ? await handleUploadRequest(request, DATABASE, enableAuth, USERNAME, PASSWORD, domain, TG_BOT_TOKEN, TG_CHAT_ID, maxSize)
        : new Response('Method Not Allowed', { status: 405 });
    }

    // Route: Remote URL Ingestion (SSRF Hardened)
    if (pathname === '/hosturl') {
      return await handleUrlUploadRequest(request, DATABASE, enableAuth, USERNAME, PASSWORD, domain, TG_BOT_TOKEN, TG_CHAT_ID, maxSize);
    }

    // Route: Developer API Documentation
    if (pathname === '/docs') {
      return serveDocumentationPage(domain);
    }

    // Route: Curated Wallpapers Feed
    if (pathname === '/wallpapers') {
      return handleBingImagesRequest(request);
    }

    // Routes: Admin Dashboard & APIs
    if (pathname === `/${adminPath}`) {
      return await handleAdminRequest(DATABASE, request, USERNAME, PASSWORD, domain);
    }
    if (pathname === '/admin/api/media') {
      return await handleAdminMediaApiRequest(DATABASE, request, USERNAME, PASSWORD);
    }
    if (pathname === '/admin/api/keys') {
      if (request.method === 'GET') {
        return await handleAdminListKeys(DATABASE, request, USERNAME, PASSWORD);
      } else if (request.method === 'POST') {
        return await handleAdminCreateKey(DATABASE, request, USERNAME, PASSWORD);
      } else if (request.method === 'DELETE') {
        return await handleAdminDeleteKey(DATABASE, request, USERNAME, PASSWORD);
      }
      return new Response('Method Not Allowed', { status: 405 });
    }
    if (pathname === '/delete-images') {
      return await handleDeleteImagesRequest(request, DATABASE, USERNAME, PASSWORD);
    }

    // Default: Direct Media Delivery & Streaming
    return await handleImageRequest(request, DATABASE, TG_BOT_TOKEN);
  }
};

// ==========================================
// CONSTANTS & MIME TYPE DEFINITIONS
// ==========================================
const MIME_TYPES = {
  // Images
  jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', gif: 'image/gif',
  webp: 'image/webp', svg: 'image/svg+xml', bmp: 'image/bmp', ico: 'image/x-icon',
  tiff: 'image/tiff', tif: 'image/tiff', avif: 'image/avif', heic: 'image/heic',
  // Videos
  mp4: 'video/mp4', webm: 'video/webm', mkv: 'video/x-matroska', mov: 'video/quicktime',
  avi: 'video/x-msvideo', wmv: 'video/x-ms-wmv', flv: 'video/x-flv', m4v: 'video/x-m4v',
  // Audio
  mp3: 'audio/mpeg', wav: 'audio/wav', ogg: 'audio/ogg', m4a: 'audio/m4a',
  flac: 'audio/flac', aac: 'audio/aac', opus: 'audio/opus',
  // Documents
  pdf: 'application/pdf', doc: 'application/msword',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  xls: 'application/vnd.ms-excel',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  ppt: 'application/vnd.ms-powerpoint',
  pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  odt: 'application/vnd.oasis.opendocument.text',
  // Text & Code
  txt: 'text/plain; charset=utf-8', md: 'text/markdown; charset=utf-8',
  json: 'application/json; charset=utf-8', csv: 'text/csv; charset=utf-8',
  xml: 'application/xml; charset=utf-8', log: 'text/plain; charset=utf-8',
  html: 'text/html; charset=utf-8', css: 'text/css; charset=utf-8',
  js: 'application/javascript; charset=utf-8', ts: 'text/typescript; charset=utf-8',
  py: 'text/x-python; charset=utf-8', sh: 'text/x-shellscript; charset=utf-8',
  bat: 'application/x-bat', cmd: 'application/x-bat', ps1: 'text/plain; charset=utf-8',
  yaml: 'text/yaml; charset=utf-8', yml: 'text/yaml; charset=utf-8',
  ini: 'text/plain; charset=utf-8', toml: 'text/plain; charset=utf-8',
  sql: 'text/plain; charset=utf-8',
  // Archives
  zip: 'application/zip', rar: 'application/x-rar-compressed', '7z': 'application/x-7z-compressed',
  tar: 'application/x-tar', gz: 'application/gzip', bz2: 'application/x-bzip2',
  // Executables & Binaries
  exe: 'application/x-msdownload', msi: 'application/x-msdownload',
  apk: 'application/vnd.android.package-archive', bin: 'application/octet-stream'
};

const EXECUTABLE_EXTENSIONS = new Set([
  'html', 'htm', 'xhtml', 'js', 'mjs', 'ts', 'css', 'xml', 'svg',
  'bat', 'cmd', 'ps1', 'sh', 'bash', 'vbs', 'exe', 'msi', 'bin', 'dll', 'apk', 'jar'
]);

// ==========================================
// CORE HELPERS & UTILITIES
// ==========================================
function formatBytes(bytes) {
  if (!bytes || isNaN(bytes) || bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function detectMimeType(filename, defaultMime = 'application/octet-stream') {
  if (!filename) return defaultMime;
  const ext = filename.split('.').pop().toLowerCase();
  return MIME_TYPES[ext] || defaultMime || 'application/octet-stream';
}

function generateSlug() {
  const timestamp = Date.now().toString(36);
  const randomPart = Math.random().toString(36).substring(2, 8);
  return `${Date.now()}_${randomPart}`;
}

function isValidCredentials(authHeader, USERNAME, PASSWORD) {
  if (!authHeader || typeof authHeader !== 'string') return false;
  try {
    const parts = authHeader.trim().split(' ');
    if (parts.length < 2 || parts[0].toLowerCase() !== 'basic') return false;
    const decoded = atob(parts[1]);
    const colonIndex = decoded.indexOf(':');
    if (colonIndex === -1) return false;
    const user = decoded.substring(0, colonIndex);
    const pass = decoded.substring(colonIndex + 1);
    return user === USERNAME && pass === PASSWORD;
  } catch {
    return false;
  }
}

function authenticate(request, USERNAME, PASSWORD) {
  const authHeader = request.headers.get('Authorization');
  return isValidCredentials(authHeader, USERNAME, PASSWORD);
}

async function ensureApiKeysTable(DATABASE) {
  if (!DATABASE) return;
  try {
    await DATABASE.prepare(`
      CREATE TABLE IF NOT EXISTS api_keys (
        key TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        created_at INTEGER NOT NULL,
        active INTEGER DEFAULT 1,
        uploads_count INTEGER DEFAULT 0
      )
    `).run();
  } catch (err) {
    // Graceful fallback if table exists or DB is read-only
  }
}

async function validateApiKey(request, env, extraKey = null) {
  const DATABASE = env.DATABASE;

  // 1. Collect all env-configured keys (support single or comma-separated tokens)
  const envKeys = new Set();
  if (env.API_KEY) {
    env.API_KEY.split(',').map(k => k.trim()).filter(Boolean).forEach(k => envKeys.add(k));
  }
  if (env.API_KEYS) {
    env.API_KEYS.split(',').map(k => k.trim()).filter(Boolean).forEach(k => envKeys.add(k));
  }

  // 2. Extract candidate key from request
  let candidate = extraKey ? String(extraKey).trim() : null;
  if (!candidate) {
    const headerKey = request.headers.get('X-API-Key');
    if (headerKey) candidate = headerKey.trim();
  }
  if (!candidate) {
    const authHeader = request.headers.get('Authorization');
    if (authHeader && authHeader.toLowerCase().startsWith('bearer ')) {
      candidate = authHeader.substring(7).trim();
    }
  }
  if (!candidate) {
    const url = new URL(request.url);
    const qKey = url.searchParams.get('key') || url.searchParams.get('api_key');
    if (qKey) candidate = qKey.trim();
  }

  // 3. Match against environment keys
  if (candidate && envKeys.has(candidate)) {
    return { valid: true, name: 'Environment Key', key: candidate };
  }

  // 4. Match against D1 database keys
  let d1HasKeys = false;
  if (DATABASE) {
    try {
      await ensureApiKeysTable(DATABASE);
      if (candidate) {
        const row = await DATABASE.prepare('SELECT key, name, active FROM api_keys WHERE key = ?').bind(candidate).first();
        if (row && row.active === 1) {
          // Asynchronously increment upload counter
          DATABASE.prepare('UPDATE api_keys SET uploads_count = uploads_count + 1 WHERE key = ?').bind(candidate).run().catch(() => {});
          return { valid: true, name: row.name, key: candidate };
        }
      }
      // Check if any active keys exist in D1
      const countResult = await DATABASE.prepare('SELECT COUNT(*) as count FROM api_keys WHERE active = 1').first();
      if (countResult && countResult.count > 0) {
        d1HasKeys = true;
      }
    } catch (err) {
      console.warn('D1 api_keys lookup error:', err.message);
    }
  }

  // 5. Open access check: if NO keys are configured in env and NO keys in D1, allow upload
  if (envKeys.size === 0 && !d1HasKeys) {
    return { valid: true, name: 'Open Access (No keys configured)', key: null };
  }

  // 6. If keys are configured, reject invalid or missing key
  return {
    valid: false,
    error: candidate
      ? 'Invalid or revoked developer API key'
      : 'Missing API key. Provide your token via X-API-Key header, Bearer token, or key parameter.'
  };
}

function isSafeUrl(urlString) {
  try {
    const parsed = new URL(urlString);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return { safe: false, reason: 'Only HTTP and HTTPS protocols are supported.' };
    }
    const hostname = parsed.hostname.toLowerCase();
    if (
      hostname === 'localhost' ||
      hostname === '127.0.0.1' ||
      hostname === '::1' ||
      hostname === '0.0.0.0' ||
      hostname.endsWith('.localhost') ||
      hostname.endsWith('.local') ||
      hostname === '169.254.169.254' ||
      hostname === 'metadata.google.internal'
    ) {
      return { safe: false, reason: 'Access to internal or loopback hosts is prohibited.' };
    }
    const ipMatch = hostname.match(/^(\d+)\.(\d+)\.(\d+)\.(\d+)$/);
    if (ipMatch) {
      const b1 = parseInt(ipMatch[1], 10);
      const b2 = parseInt(ipMatch[2], 10);
      if (b1 === 10) return { safe: false, reason: 'Access to private 10.0.0.0/8 network is prohibited.' };
      if (b1 === 172 && b2 >= 16 && b2 <= 31) return { safe: false, reason: 'Access to private 172.16.0.0/12 network is prohibited.' };
      if (b1 === 192 && b2 === 168) return { safe: false, reason: 'Access to private 192.168.0.0/16 network is prohibited.' };
      if (b1 === 127) return { safe: false, reason: 'Access to loopback 127.0.0.0/8 network is prohibited.' };
      if (b1 === 169 && b2 === 254) return { safe: false, reason: 'Access to link-local 169.254.0.0/16 network is prohibited.' };
      if (b1 === 0) return { safe: false, reason: 'Access to 0.0.0.0/8 network is prohibited.' };
    }
    return { safe: true, url: parsed };
  } catch {
    return { safe: false, reason: 'Invalid URL format.' };
  }
}

function base64ToUint8Array(base64Str) {
  let cleanBase64 = base64Str.trim();
  let mime = 'application/octet-stream';
  if (cleanBase64.startsWith('data:')) {
    const commaIdx = cleanBase64.indexOf(',');
    if (commaIdx !== -1) {
      const header = cleanBase64.substring(5, commaIdx);
      mime = header.split(';')[0] || mime;
      cleanBase64 = cleanBase64.substring(commaIdx + 1);
    }
  }
  const binaryString = atob(cleanBase64.replace(/\s/g, ''));
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return { bytes, mime };
}

async function uploadToTelegram(fileBlob, filename, mimeType, TG_BOT_TOKEN, TG_CHAT_ID) {
  const uploadFormData = new FormData();
  uploadFormData.append('chat_id', TG_CHAT_ID);

  let tgFileName = filename || 'file.bin';
  if (mimeType.startsWith('image/gif')) {
    const newFileName = tgFileName.replace(/\.gif$/i, '.jpeg');
    const newFile = new File([fileBlob], newFileName, { type: 'image/jpeg' });
    uploadFormData.append('document', newFile);
    tgFileName = newFileName;
  } else {
    const file = new File([fileBlob], tgFileName, { type: mimeType });
    uploadFormData.append('document', file);
  }

  const telegramResponse = await fetch(`https://api.telegram.org/bot${TG_BOT_TOKEN}/sendDocument`, {
    method: 'POST',
    body: uploadFormData
  });

  if (!telegramResponse.ok) {
    const errorData = await telegramResponse.json().catch(() => ({}));
    throw new Error(errorData.description || 'Upload to Telegram storage failed');
  }

  const responseData = await telegramResponse.json();
  let fileId;
  if (responseData.result.document) fileId = responseData.result.document.file_id;
  else if (responseData.result.video) fileId = responseData.result.video.file_id;
  else if (responseData.result.audio) fileId = responseData.result.audio.file_id;
  else if (responseData.result.sticker) fileId = responseData.result.sticker.file_id;
  else if (responseData.result.photo) fileId = responseData.result.photo[responseData.result.photo.length - 1].file_id;
  else throw new Error('No valid file identifier returned by Telegram');

  let resolvedName = tgFileName;
  if (responseData.result.document && responseData.result.document.file_name) {
    resolvedName = responseData.result.document.file_name;
  } else if (responseData.result.video && responseData.result.video.file_name) {
    resolvedName = responseData.result.video.file_name;
  } else if (responseData.result.audio && responseData.result.audio.file_name) {
    resolvedName = responseData.result.audio.file_name;
  }

  return { fileId, resolvedName };
}

async function insertMediaRecord(DATABASE, imageURL, fileId, originalFileName, fileSize, mimeType, timestamp, deleteToken) {
  try {
    await DATABASE.prepare(`
      INSERT INTO media (url, fileId, filename, file_size, mime_type, created_at, delete_token)
      VALUES (?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(url) DO UPDATE SET fileId = excluded.fileId, filename = excluded.filename
    `).bind(imageURL, fileId, originalFileName, fileSize, mimeType, timestamp, deleteToken).run();
  } catch (err) {
    await DATABASE.prepare(`
      INSERT INTO media (url, fileId, filename)
      VALUES (?, ?, ?)
      ON CONFLICT(url) DO UPDATE SET fileId = excluded.fileId, filename = excluded.filename
    `).bind(imageURL, fileId, originalFileName).run();
  }
}

// ==========================================
// PRIMARY DEVELOPER API: POST /api/upload
// ==========================================
async function handleDeveloperApiUpload(request, env, domain, TG_BOT_TOKEN, TG_CHAT_ID, maxSize) {
  try {
    let fileBuffer;
    let fileName = 'upload.bin';
    let mimeType = 'application/octet-stream';
    let customName = null;
    let bodyKey = null;

    const contentType = request.headers.get('content-type') || '';

    if (contentType.includes('multipart/form-data') || contentType.includes('application/x-www-form-urlencoded')) {
      const formData = await request.formData();
      bodyKey = formData.get('key') || formData.get('api_key') || formData.get('token');
      const file = formData.get('file') || formData.get('image');
      customName = formData.get('name');

      const authCheck = await validateApiKey(request, env, bodyKey);
      if (!authCheck.valid) {
        return new Response(JSON.stringify({
          success: false,
          error: authCheck.error || 'Unauthorized. Provide a valid developer API token via X-API-Key header or key parameter.'
        }), { status: 401, headers: { 'Content-Type': 'application/json' } });
      }

      if (!file) {
        return new Response(JSON.stringify({ success: false, error: 'Missing "file" field in request' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      if (typeof file === 'string') {
        if (file.startsWith('http://') || file.startsWith('https://')) {
          const safeCheck = isSafeUrl(file);
          if (!safeCheck.safe) return new Response(JSON.stringify({ success: false, error: safeCheck.reason }), { status: 400 });
          const fetchRes = await fetch(file);
          if (!fetchRes.ok) throw new Error('Failed to fetch remote URL');
          fileBuffer = await fetchRes.arrayBuffer();
          mimeType = fetchRes.headers.get('content-type') || 'application/octet-stream';
          fileName = new URL(file).pathname.split('/').pop() || 'remote-file.bin';
        } else {
          const decoded = base64ToUint8Array(file);
          fileBuffer = decoded.bytes.buffer;
          mimeType = decoded.mime;
        }
      } else {
        fileBuffer = await file.arrayBuffer();
        fileName = file.name || 'upload.bin';
        mimeType = file.type || detectMimeType(fileName);
      }
    } else if (contentType.includes('application/json')) {
      const json = await request.json();
      bodyKey = json.key || json.api_key || json.token;

      const authCheck = await validateApiKey(request, env, bodyKey);
      if (!authCheck.valid) {
        return new Response(JSON.stringify({
          success: false,
          error: authCheck.error || 'Unauthorized. Provide a valid developer API token via X-API-Key header or key parameter.'
        }), { status: 401, headers: { 'Content-Type': 'application/json' } });
      }

      const input = json.file || json.image || json.url;
      customName = json.name;
      if (!input) return new Response(JSON.stringify({ success: false, error: 'Missing file, image, or url in JSON body' }), { status: 400 });
      if (input.startsWith('http://') || input.startsWith('https://')) {
        const safeCheck = isSafeUrl(input);
        if (!safeCheck.safe) return new Response(JSON.stringify({ success: false, error: safeCheck.reason }), { status: 400 });
        const fetchRes = await fetch(input);
        if (!fetchRes.ok) throw new Error('Failed to fetch remote URL');
        fileBuffer = await fetchRes.arrayBuffer();
        mimeType = fetchRes.headers.get('content-type') || 'application/octet-stream';
        fileName = new URL(input).pathname.split('/').pop() || 'remote-file.bin';
      } else {
        const decoded = base64ToUint8Array(input);
        fileBuffer = decoded.bytes.buffer;
        mimeType = decoded.mime;
      }
    } else {
      const authCheck = await validateApiKey(request, env);
      if (!authCheck.valid) {
        return new Response(JSON.stringify({
          success: false,
          error: authCheck.error || 'Unauthorized. Provide a valid developer API token via X-API-Key header or key parameter.'
        }), { status: 401, headers: { 'Content-Type': 'application/json' } });
      }
      fileBuffer = await request.arrayBuffer();
      fileName = request.headers.get('x-filename') || 'upload.bin';
      mimeType = contentType || 'application/octet-stream';
    }

    if (fileBuffer.byteLength > maxSize) {
      return new Response(JSON.stringify({ success: false, error: `File size exceeds ${maxSize / (1024 * 1024)}MB limit` }), {
        status: 413,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    if (customName) {
      const ext = fileName.split('.').pop();
      fileName = customName.includes('.') ? customName : `${customName}.${ext}`;
    }

    const { fileId, resolvedName } = await uploadToTelegram(fileBuffer, fileName, mimeType, TG_BOT_TOKEN, TG_CHAT_ID);

    const ext = (resolvedName.split('.').pop() || fileName.split('.').pop() || 'bin').toLowerCase();
    const slug = generateSlug();
    const timestamp = Date.now();
    const deleteToken = crypto.randomUUID();
    const imageURL = `https://${domain}/${slug}.${ext}`;

    await insertMediaRecord(env.DATABASE, imageURL, fileId, resolvedName, fileBuffer.byteLength, mimeType, timestamp, deleteToken);

    // Direct developer response
    return new Response(JSON.stringify({
      success: true,
      url: imageURL,
      filename: resolvedName,
      size: fileBuffer.byteLength,
      size_formatted: formatBytes(fileBuffer.byteLength),
      mime_type: mimeType,
      uploaded_at: new Date(timestamp).toISOString()
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

// Optional ImgBB v1 Drop-in API (POST /api/1/upload)
async function handleImgBBApiUpload(request, env, domain, TG_BOT_TOKEN, TG_CHAT_ID, maxSize) {
  try {
    let fileBuffer;
    let fileName = 'file.bin';
    let mimeType = 'application/octet-stream';
    let customName = null;
    let bodyKey = null;

    const contentType = request.headers.get('content-type') || '';

    if (contentType.includes('multipart/form-data') || contentType.includes('application/x-www-form-urlencoded')) {
      const formData = await request.formData();
      bodyKey = formData.get('key') || formData.get('api_key');
      const input = formData.get('image') || formData.get('file');
      customName = formData.get('name');

      const authCheck = await validateApiKey(request, env, bodyKey);
      if (!authCheck.valid) {
        return new Response(JSON.stringify({
          status_code: 401,
          error: { message: authCheck.error || 'Invalid or missing API key', code: 401 },
          status_txt: 'Unauthorized'
        }), { status: 401, headers: { 'Content-Type': 'application/json' } });
      }

      if (!input) {
        return new Response(JSON.stringify({
          status_code: 400,
          error: { message: 'Missing image or file parameter', code: 400 },
          status_txt: 'Bad Request'
        }), { status: 400, headers: { 'Content-Type': 'application/json' } });
      }

      if (typeof input === 'string') {
        if (input.startsWith('http://') || input.startsWith('https://')) {
          const safeCheck = isSafeUrl(input);
          if (!safeCheck.safe) return new Response(JSON.stringify({ status_code: 400, error: { message: safeCheck.reason } }), { status: 400 });
          const fetchRes = await fetch(input);
          if (!fetchRes.ok) throw new Error('Failed to fetch remote URL');
          fileBuffer = await fetchRes.arrayBuffer();
          mimeType = fetchRes.headers.get('content-type') || 'application/octet-stream';
          fileName = new URL(input).pathname.split('/').pop() || 'remote-file.bin';
        } else {
          const decoded = base64ToUint8Array(input);
          fileBuffer = decoded.bytes.buffer;
          mimeType = decoded.mime;
        }
      } else {
        fileBuffer = await input.arrayBuffer();
        fileName = input.name || 'upload.bin';
        mimeType = input.type || detectMimeType(fileName);
      }
    } else {
      fileBuffer = await request.arrayBuffer();
      fileName = 'upload.bin';
      mimeType = contentType || 'application/octet-stream';
    }

    if (fileBuffer.byteLength > maxSize) {
      return new Response(JSON.stringify({
        status_code: 413,
        error: { message: `File size exceeds ${maxSize / (1024 * 1024)}MB limit`, code: 413 }
      }), { status: 413, headers: { 'Content-Type': 'application/json' } });
    }

    if (customName) {
      const ext = fileName.split('.').pop();
      fileName = customName.includes('.') ? customName : `${customName}.${ext}`;
    }

    const { fileId, resolvedName } = await uploadToTelegram(fileBuffer, fileName, mimeType, TG_BOT_TOKEN, TG_CHAT_ID);

    const ext = (resolvedName.split('.').pop() || fileName.split('.').pop() || 'bin').toLowerCase();
    const slug = generateSlug();
    const timestamp = Date.now();
    const deleteToken = crypto.randomUUID();
    const imageURL = `https://${domain}/${slug}.${ext}`;
    const nameWithoutExt = resolvedName.replace(/\.[^/.]+$/, '');

    await insertMediaRecord(env.DATABASE, imageURL, fileId, resolvedName, fileBuffer.byteLength, mimeType, timestamp, deleteToken);

    return new Response(JSON.stringify({
      data: {
        id: slug,
        title: resolvedName,
        url: imageURL,
        display_url: imageURL,
        size: fileBuffer.byteLength,
        time: Math.floor(timestamp / 1000),
        image: {
          filename: resolvedName,
          name: nameWithoutExt,
          mime: mimeType,
          extension: ext,
          url: imageURL
        }
      },
      success: true,
      status: 200
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return new Response(JSON.stringify({
      status_code: 500,
      error: { message: error.message || 'Internal Server Error', code: 500 }
    }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
}

// Redirect /v/:id to direct file URL
async function handleViewerRedirect(request, DATABASE, domain) {
  const urlObj = new URL(request.url);
  const slug = urlObj.pathname.split('/')[2]?.split('.')[0];
  if (!slug) return Response.redirect(`https://${domain}/`, 302);

  const record = await DATABASE.prepare('SELECT url FROM media WHERE url LIKE ? OR url LIKE ?')
    .bind(`%/${slug}`, `%/${slug}.%`).first();

  if (record && record.url) {
    return Response.redirect(record.url, 302);
  }
  return new Response('File Not Found', { status: 404 });
}

// ShareX Configuration Generator (.sxcu)
function handleShareXConfigRequest(request, domain) {
  const sxcuConfig = {
    Version: '15.0.0',
    Name: `CommonThread (${domain})`,
    DestinationType: 'ImageUploader, TextUploader, FileUploader',
    RequestMethod: 'POST',
    RequestURL: `https://${domain}/api/upload`,
    Body: 'MultipartFormData',
    FileFormName: 'file',
    URL: '$json:url$'
  };

  return new Response(JSON.stringify(sxcuConfig, null, 2), {
    status: 200,
    headers: {
      'Content-Type': 'application/octet-stream',
      'Content-Disposition': `attachment; filename="CommonThread-${domain}.sxcu"`
    }
  });
}

// Metadata Info API (GET /api/info?url=... or /api/info?id=...)
async function handleApiInfoRequest(request, DATABASE, domain) {
  try {
    const urlObj = new URL(request.url);
    const targetUrl = urlObj.searchParams.get('url');
    const id = urlObj.searchParams.get('id');

    if (!targetUrl && !id) {
      return new Response(JSON.stringify({ success: false, error: 'Provide url or id parameter' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    let record = null;
    if (targetUrl) {
      record = await DATABASE.prepare('SELECT * FROM media WHERE url = ?').bind(targetUrl).first();
    } else if (id) {
      record = await DATABASE.prepare('SELECT * FROM media WHERE url LIKE ? OR url LIKE ?')
        .bind(`%/${id}`, `%/${id}.%`).first();
    }

    if (!record) {
      return new Response(JSON.stringify({ success: false, error: 'Media not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const filename = record.filename || record.url.split('/').pop();
    const ext = filename.split('.').pop().toLowerCase();
    const slug = record.url.split('/').pop().split('.')[0];

    return new Response(JSON.stringify({
      success: true,
      data: {
        id: slug,
        filename: filename,
        extension: ext,
        mime_type: record.mime_type || detectMimeType(filename),
        size: record.file_size || null,
        size_formatted: record.file_size ? formatBytes(record.file_size) : null,
        url: record.url,
        created_at: record.created_at ? new Date(record.created_at).toISOString() : null
      }
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

// Delete Media API (POST /api/delete)
async function handleApiDeleteRequest(request, DATABASE, USERNAME, PASSWORD) {
  try {
    const urlObj = new URL(request.url);
    let token = urlObj.searchParams.get('token');
    let targetUrl = urlObj.searchParams.get('url');

    if (request.method === 'POST') {
      try {
        const body = await request.json();
        token = body.token || token;
        targetUrl = body.url || targetUrl;
      } catch {}
    }

    if (!targetUrl) {
      return new Response(JSON.stringify({ success: false, error: 'Missing target url parameter' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const isAdmin = authenticate(request, USERNAME, PASSWORD);
    let authorized = isAdmin;
    if (!authorized && token) {
      const record = await DATABASE.prepare('SELECT delete_token FROM media WHERE url = ?').bind(targetUrl).first();
      if (record && record.delete_token && record.delete_token === token) {
        authorized = true;
      }
    }

    if (!authorized) {
      return new Response(JSON.stringify({ success: false, error: 'Unauthorized to delete this file' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    await DATABASE.prepare('DELETE FROM media WHERE url = ?').bind(targetUrl).run();

    const cache = caches.default;
    const cacheKey = new Request(targetUrl);
    await cache.delete(cacheKey);

    return new Response(JSON.stringify({ success: true, message: 'File deleted successfully' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

// Telegram Bot Register Request (POST /api/register)
async function handleApiRegisterRequest(request, env, domain, USERNAME, PASSWORD) {
  try {
    const isBasicAuth = authenticate(request, USERNAME, PASSWORD);
    const keyCheck = await validateApiKey(request, env);
    if (!isBasicAuth && !keyCheck.valid) {
      return new Response(JSON.stringify({ error: 'Unauthorized. Provide valid admin credentials or developer API key.' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    const DATABASE = env.DATABASE;
    const data = await request.json();
    const { fileId, originalFileName, fileExtension, fileSize, mediaType } = data;
    if (!fileId) return new Response(JSON.stringify({ error: 'Missing fileId' }), { status: 400 });

    const slug = generateSlug();
    const ext = fileExtension || 'bin';
    const timestamp = Date.now();
    const deleteToken = crypto.randomUUID();
    const imageURL = `https://${domain}/${slug}.${ext}`;
    const finalName = originalFileName || `telegram_upload.${ext}`;
    const detectedMime = mediaType || detectMimeType(finalName);

    await insertMediaRecord(DATABASE, imageURL, fileId, finalName, fileSize || 0, detectedMime, timestamp, deleteToken);

    const json = {
      data: imageURL,
      url: imageURL,
      filename: finalName,
      size: fileSize || 0,
      uploaded_on: new Date(timestamp).toISOString(),
      media_type: detectedMime,
      creator: 'https://t.me/Imagehostssbot'
    };
    return new Response(JSON.stringify(json), { status: 200, headers: { 'Content-Type': 'application/json' } });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
}

// Form Upload Request (POST /upload)
async function handleUploadRequest(request, DATABASE, enableAuth, USERNAME, PASSWORD, domain, TG_BOT_TOKEN, TG_CHAT_ID, maxSize) {
  try {
    if (enableAuth && !authenticate(request, USERNAME, PASSWORD)) {
      return new Response('Unauthorized', { status: 401, headers: { 'WWW-Authenticate': 'Basic realm="Admin"' } });
    }

    const formData = await request.formData();
    const file = formData.get('file');
    if (!file) throw new Error('Missing file parameter');

    if (file.size > maxSize) {
      return new Response(JSON.stringify({ error: `File size exceeds ${maxSize / (1024 * 1024)}MB Limit` }), {
        status: 413,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const fileBuffer = await file.arrayBuffer();
    const originalFileName = file.name || 'upload.bin';
    const mimeType = file.type || detectMimeType(originalFileName);

    const { fileId, resolvedName } = await uploadToTelegram(fileBuffer, originalFileName, mimeType, TG_BOT_TOKEN, TG_CHAT_ID);

    const ext = (resolvedName.split('.').pop() || 'bin').toLowerCase();
    const slug = generateSlug();
    const timestamp = Date.now();
    const deleteToken = crypto.randomUUID();
    const imageURL = `https://${domain}/${slug}.${ext}`;

    await insertMediaRecord(DATABASE, imageURL, fileId, resolvedName, file.size, mimeType, timestamp, deleteToken);

    const json = {
      success: true,
      data: imageURL,
      url: imageURL,
      filename: resolvedName,
      size: file.size,
      size_formatted: formatBytes(file.size),
      uploaded_on: new Date(timestamp).toISOString(),
      media_type: mimeType
    };
    return new Response(JSON.stringify(json), { status: 200, headers: { 'Content-Type': 'application/json' } });
  } catch (error) {
    console.error('Upload Error:', error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
}

// Hardened Remote URL Ingestion (GET /hosturl?url=...)
async function handleUrlUploadRequest(request, DATABASE, enableAuth, USERNAME, PASSWORD, domain, TG_BOT_TOKEN, TG_CHAT_ID, maxSize) {
  try {
    if (enableAuth && !authenticate(request, USERNAME, PASSWORD)) {
      return new Response('Unauthorized', { status: 401, headers: { 'WWW-Authenticate': 'Basic realm="Admin"' } });
    }

    const url = new URL(request.url);
    const fileUrl = url.searchParams.get('url');
    if (!fileUrl) {
      return new Response(JSON.stringify({ error: 'Missing url parameter' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const safeCheck = isSafeUrl(fileUrl);
    if (!safeCheck.safe) {
      return new Response(JSON.stringify({ error: safeCheck.reason }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const fileResponse = await fetch(fileUrl);
    if (!fileResponse.ok) {
      return new Response(JSON.stringify({ error: 'Failed to download file from URL' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const contentLength = fileResponse.headers.get('content-length');
    if (contentLength && parseInt(contentLength, 10) > maxSize) {
      return new Response(JSON.stringify({ error: `File size exceeds ${maxSize / (1024 * 1024)}MB Limit` }), {
        status: 413,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const contentType = fileResponse.headers.get('content-type') || 'application/octet-stream';
    const fileName = new URL(fileUrl).pathname.split('/').pop() || 'downloaded-file';
    const fileBuffer = await fileResponse.arrayBuffer();

    if (fileBuffer.byteLength > maxSize) {
      return new Response(JSON.stringify({ error: `File size exceeds ${maxSize / (1024 * 1024)}MB Limit` }), {
        status: 413,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const { fileId, resolvedName } = await uploadToTelegram(fileBuffer, fileName, contentType, TG_BOT_TOKEN, TG_CHAT_ID);

    const ext = (resolvedName.split('.').pop() || fileName.split('.').pop() || 'bin').toLowerCase();
    const slug = generateSlug();
    const timestamp = Date.now();
    const deleteToken = crypto.randomUUID();
    const imageURL = `https://${domain}/${slug}.${ext}`;

    await insertMediaRecord(DATABASE, imageURL, fileId, resolvedName, fileBuffer.byteLength, contentType, timestamp, deleteToken);

    const json = {
      success: true,
      data: imageURL,
      url: imageURL,
      filename: resolvedName,
      size: fileBuffer.byteLength,
      size_formatted: formatBytes(fileBuffer.byteLength),
      uploaded_on: new Date(timestamp).toISOString(),
      media_type: contentType
    };
    return new Response(JSON.stringify(json), { status: 200, headers: { 'Content-Type': 'application/json' } });
  } catch (error) {
    console.error('URL Upload Error:', error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
}

// ==========================================
// MEDIA RETRIEVAL & STREAMING (RANGE SUPPORT)
// ==========================================
async function handleImageRequest(request, DATABASE, TG_BOT_TOKEN) {
  const urlObj = new URL(request.url);
  const cleanUrl = `${urlObj.protocol}//${urlObj.host}${urlObj.pathname}`;
  const cache = caches.default;
  const cacheKey = new Request(cleanUrl);

  const rangeHeader = request.headers.get('Range');

  if (!rangeHeader) {
    const cachedResponse = await cache.match(cacheKey);
    if (cachedResponse) return cachedResponse;
  }

  let result = await DATABASE.prepare('SELECT fileId, filename FROM media WHERE url = ?').bind(cleanUrl).first();

  if (!result) {
    const slug = urlObj.pathname.split('/').pop().split('.')[0];
    result = await DATABASE.prepare('SELECT fileId, filename FROM media WHERE url LIKE ? OR url LIKE ?')
      .bind(`%/${slug}`, `%/${slug}.%`).first();
  }

  if (!result) {
    return new Response('File Not Found', {
      status: 404,
      headers: {
        'Content-Type': 'text/plain',
        'Cache-Control': 'no-store, no-cache, must-revalidate'
      }
    });
  }

  const fileId = result.fileId;
  let filePath;
  let attempts = 0;
  while (attempts < 3) {
    const getFilePath = await fetch(`https://api.telegram.org/bot${TG_BOT_TOKEN}/getFile?file_id=${fileId}`);
    if (!getFilePath.ok) return new Response('Failed to locate file on storage server', { status: 502 });
    const fileData = await getFilePath.json();
    if (fileData.ok && fileData.result.file_path) {
      filePath = fileData.result.file_path;
      break;
    }
    attempts++;
  }

  if (!filePath) {
    return new Response('File path resolution failed', { status: 404 });
  }

  const getFileResponse = `https://api.telegram.org/file/bot${TG_BOT_TOKEN}/${filePath}`;

  const fetchHeaders = new Headers();
  if (rangeHeader) {
    fetchHeaders.set('Range', rangeHeader);
  }

  const response = await fetch(getFileResponse, { headers: fetchHeaders });
  if (!response.ok && response.status !== 206) {
    return new Response('Failed to obtain file content from storage', { status: 502 });
  }

  const fileExtension = (result.filename || cleanUrl).split('.').pop().toLowerCase();
  const contentType = result.mime_type || MIME_TYPES[fileExtension] || 'application/octet-stream';

  const headers = new Headers(response.headers);
  headers.set('Content-Type', contentType);
  headers.set('Accept-Ranges', 'bytes');

  const shouldForceDownload = EXECUTABLE_EXTENSIONS.has(fileExtension);
  const cleanFilename = (result.filename || `file.${fileExtension}`).replace(/[^\w\.\-\s]/g, '_');

  if (shouldForceDownload) {
    headers.set('Content-Disposition', `attachment; filename="${cleanFilename}"`);
  } else {
    headers.set('Content-Disposition', `inline; filename="${cleanFilename}"`);
  }

  if (response.status === 200 && !rangeHeader) {
    headers.set('Cache-Control', 'public, max-age=31536000, immutable');
    const responseToCache = new Response(response.body, { status: 200, headers });
    await cache.put(cacheKey, responseToCache.clone()).catch(() => {});
    return responseToCache;
  }

  return new Response(response.body, {
    status: response.status,
    headers
  });
}

// ==========================================
// CLEAN WEB UI (Root /)
// ==========================================
async function handleRootRequest(request, USERNAME, PASSWORD, enableAuth, domain) {
  if (enableAuth && !authenticate(request, USERNAME, PASSWORD)) {
    return new Response('Unauthorized', { status: 401, headers: { 'WWW-Authenticate': 'Basic realm="Admin"' } });
  }

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>CommonThread - Universal Media Hosting & Developer API</title>
  <meta name="description" content="Host any media: images, videos, audio, PDF, documents, scripts (.bat, .sh), and text. Simple Developer API available.">
  <script src="https://cdn.tailwindcss.com"></script>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
  <script src="https://code.iconify.design/3/3.1.1/iconify.min.js"></script>
  <style>
    body { font-family: 'Inter', sans-serif; background-color: #09090b; }
    .mono { font-family: 'JetBrains Mono', monospace; }
  </style>
</head>
<body class="text-zinc-100 min-h-screen flex flex-col antialiased selection:bg-orange-500/20 selection:text-orange-300">
  <header class="border-b border-zinc-800/80 bg-zinc-950/80 backdrop-blur-xl sticky top-0 z-50">
    <div class="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
      <a href="/" class="flex items-center gap-2.5">
        <div class="w-9 h-9 rounded-xl bg-gradient-to-tr from-orange-500 to-amber-400 flex items-center justify-center text-black font-bold text-lg shadow-lg shadow-orange-500/20">
          <span class="iconify" data-icon="lucide:layers"></span>
        </div>
        <span class="font-bold text-lg tracking-tight">CommonThread</span>
      </a>
      <div class="flex items-center gap-3">
        <a href="/docs" class="px-3.5 py-2 rounded-xl bg-orange-500 hover:bg-orange-600 text-black font-semibold text-xs transition flex items-center gap-1.5 shadow-lg shadow-orange-500/10">
          <span class="iconify" data-icon="lucide:terminal"></span>
          <span>Developer API Docs</span>
        </a>
        <a href="/admin" class="px-3 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-300 text-xs font-medium border border-zinc-800 transition">
          Admin
        </a>
      </div>
    </div>
  </header>

  <main class="flex-1 max-w-3xl w-full mx-auto px-4 py-12 flex flex-col gap-8 justify-center">
    <div class="text-center space-y-3">
      <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-orange-500/10 border border-orange-500/20 text-orange-400 text-xs font-semibold uppercase tracking-wider">
        <span>Universal Media Host & Developer API</span>
      </div>
      <h1 class="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
        Host Any Media & Files
      </h1>
      <p class="text-zinc-400 text-sm max-w-lg mx-auto">
        Upload images, PDFs, videos, audio, text, or scripts (<code class="text-orange-400">.bat</code>, <code class="text-orange-400">.sh</code>, <code class="text-orange-400">.txt</code>) and get instant direct links.
      </p>
    </div>

    <!-- Upload Card -->
    <div class="bg-zinc-900/60 border border-zinc-800 rounded-3xl p-6 sm:p-8 backdrop-blur-xl shadow-2xl space-y-6">
      <div id="dropzone" class="border-2 border-dashed border-zinc-700 rounded-2xl p-8 sm:p-12 text-center cursor-pointer hover:border-orange-500 transition-all flex flex-col items-center justify-center gap-3">
        <input type="file" id="file-input" class="hidden" />
        <div class="w-14 h-14 rounded-2xl bg-orange-500/10 text-orange-400 flex items-center justify-center text-3xl">
          <span class="iconify" data-icon="lucide:upload-cloud"></span>
        </div>
        <div>
          <p class="text-base font-semibold text-white">Click to browse or drag & drop any file</p>
          <p class="text-xs text-zinc-400 mt-1">Supports any media up to 20MB</p>
        </div>
        <button type="button" onclick="document.getElementById('file-input').click()" class="mt-2 px-5 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-black font-semibold text-xs transition">
          Select File
        </button>
      </div>

      <!-- Upload Progress -->
      <div id="progress-box" class="hidden space-y-2">
        <div class="flex justify-between text-xs text-zinc-400 font-medium">
          <span id="progress-status">Uploading file...</span>
          <span id="progress-percent">0%</span>
        </div>
        <div class="w-full bg-zinc-800 h-2 rounded-full overflow-hidden">
          <div id="progress-bar" class="bg-orange-500 h-full w-0 transition-all duration-300"></div>
        </div>
      </div>

      <!-- Upload Result -->
      <div id="result-box" class="hidden space-y-3 p-4 bg-zinc-950 border border-zinc-800 rounded-2xl">
        <div class="flex items-center justify-between text-xs text-zinc-400">
          <span class="font-bold text-white flex items-center gap-1.5">
            <span class="iconify text-green-400 text-base" data-icon="lucide:check-circle"></span>
            <span id="res-filename">File</span>
          </span>
          <span id="res-size">0 KB</span>
        </div>
        <div class="flex gap-2">
          <input type="text" id="res-url" readonly class="flex-1 bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-xs mono text-zinc-200 focus:outline-none" />
          <button onclick="copyDirectUrl()" class="px-4 py-2 rounded-xl bg-orange-500 hover:bg-orange-600 text-black font-semibold text-xs transition flex items-center gap-1">
            <span class="iconify" data-icon="lucide:copy"></span>
            <span id="copy-btn-label">Copy</span>
          </button>
          <a id="res-open-link" href="#" target="_blank" class="px-3 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-semibold transition flex items-center gap-1">
            <span class="iconify" data-icon="lucide:external-link"></span>
          </a>
        </div>
      </div>
    </div>

    <!-- Developer API Banner -->
    <div class="bg-gradient-to-r from-zinc-900 via-zinc-950 to-zinc-900 border border-zinc-800 rounded-2xl p-5 flex flex-col sm:flex-row items-center justify-between gap-4">
      <div class="space-y-1 text-center sm:text-left">
        <h3 class="text-sm font-bold text-white flex items-center justify-center sm:justify-start gap-2">
          <span class="iconify text-orange-400" data-icon="lucide:terminal"></span>
          <span>Upload directly from your app or project</span>
        </h3>
        <p class="text-xs text-zinc-400">Use our simple REST API <code class="text-zinc-300 mono bg-zinc-800 px-1.5 py-0.5 rounded">POST /api/upload</code> in Python, JS, cURL, etc.</p>
      </div>
      <a href="/docs" class="px-4 py-2 rounded-xl bg-orange-500 hover:bg-orange-600 text-black font-semibold text-xs transition shrink-0">
        Read API Docs &rarr;
      </a>
    </div>
  </main>

  <div id="toast" class="fixed bottom-6 right-6 px-4 py-2.5 rounded-xl bg-zinc-800 text-white text-xs font-medium border border-zinc-700 shadow-2xl opacity-0 pointer-events-none transition-all duration-300 z-50">
    Copied link!
  </div>

  <script>
    const fileInput = document.getElementById('file-input');
    const dropzone = document.getElementById('dropzone');

    ['dragenter', 'dragover'].forEach(e => dropzone.addEventListener(e, (ev) => { ev.preventDefault(); dropzone.classList.add('border-orange-500'); }));
    ['dragleave', 'drop'].forEach(e => dropzone.addEventListener(e, (ev) => { ev.preventDefault(); dropzone.classList.remove('border-orange-500'); }));
    dropzone.addEventListener('drop', (ev) => {
      if (ev.dataTransfer.files && ev.dataTransfer.files.length) uploadFile(ev.dataTransfer.files[0]);
    });
    fileInput.addEventListener('change', (ev) => {
      if (ev.target.files && ev.target.files.length) uploadFile(ev.target.files[0]);
    });
    window.addEventListener('paste', (ev) => {
      if (ev.clipboardData && ev.clipboardData.files.length) uploadFile(ev.clipboardData.files[0]);
    });

    async function uploadFile(file) {
      if (file.size > 20 * 1024 * 1024) return showToast('File exceeds 20MB limit');

      const progressBox = document.getElementById('progress-box');
      const progressBar = document.getElementById('progress-bar');
      const progressPercent = document.getElementById('progress-percent');
      const resultBox = document.getElementById('result-box');

      progressBox.classList.remove('hidden');
      resultBox.classList.add('hidden');
      progressBar.style.width = '45%';
      progressPercent.textContent = '45%';

      const fd = new FormData();
      fd.append('file', file);

      try {
        const res = await fetch('/api/upload', { method: 'POST', body: fd });
        if (!res.ok) throw new Error(await res.text());
        const data = await res.json();

        progressBar.style.width = '100%';
        progressPercent.textContent = '100%';

        setTimeout(() => {
          progressBox.classList.add('hidden');
          resultBox.classList.remove('hidden');
          document.getElementById('res-filename').textContent = data.filename;
          document.getElementById('res-size').textContent = data.size_formatted || (Math.round(data.size / 1024) + ' KB');
          document.getElementById('res-url').value = data.url;
          document.getElementById('res-open-link').href = data.url;
          showToast('Upload successful!');
        }, 400);
      } catch (err) {
        progressBox.classList.add('hidden');
        showToast('Upload failed: ' + err.message);
      }
    }

    function copyDirectUrl() {
      const input = document.getElementById('res-url');
      input.select();
      navigator.clipboard.writeText(input.value);
      showToast('Copied direct URL!');
    }

    function showToast(msg) {
      const toast = document.getElementById('toast');
      toast.textContent = msg;
      toast.classList.remove('opacity-0', 'pointer-events-none');
      setTimeout(() => toast.classList.add('opacity-0', 'pointer-events-none'), 2500);
    }
  </script>
</body>
</html>`;

  return new Response(html, {
    status: 200,
    headers: { 'Content-Type': 'text/html; charset=utf-8' }
  });
}

// ==========================================
// DEDICATED DEVELOPER API DOCUMENTATION (/docs)
// ==========================================
function serveDocumentationPage(domain) {
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Developer API - CommonThread</title>
  <meta name="description" content="Upload any media from your app, bot, or platform using the CommonThread Developer API.">
  <script src="https://cdn.tailwindcss.com"></script>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
  <script src="https://code.iconify.design/3/3.1.1/iconify.min.js"></script>
  <style>
    body { font-family: 'Inter', sans-serif; background-color: #09090b; }
    .mono { font-family: 'JetBrains Mono', monospace; }
  </style>
</head>
<body class="text-zinc-100 min-h-screen flex flex-col antialiased selection:bg-orange-500/20 selection:text-orange-300">
  <header class="border-b border-zinc-800/80 bg-zinc-950/80 backdrop-blur-xl sticky top-0 z-50">
    <div class="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
      <a href="/" class="flex items-center gap-2.5">
        <div class="w-9 h-9 rounded-xl bg-gradient-to-tr from-orange-500 to-amber-400 flex items-center justify-center text-black font-bold text-lg shadow-lg shadow-orange-500/20">
          <span class="iconify" data-icon="lucide:layers"></span>
        </div>
        <span class="font-bold text-lg tracking-tight">CommonThread <span class="text-orange-400 text-sm font-normal">Developer API</span></span>
      </a>
      <a href="/" class="px-4 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-300 text-xs font-medium border border-zinc-800 transition">
        Web Uploader &rarr;
      </a>
    </div>
  </header>

  <main class="flex-1 max-w-4xl w-full mx-auto px-4 py-10 space-y-10">
    <div class="space-y-3">
      <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-orange-500/10 border border-orange-500/20 text-orange-400 text-xs font-semibold uppercase tracking-wider">
        REST API Reference
      </div>
      <h1 class="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">Developer File Upload API</h1>
      <p class="text-zinc-400 text-sm sm:text-base max-w-2xl leading-relaxed">
        Integrate file and media uploads directly into your apps, websites, scripts, or bots. Upload any file type (images, PDF, .txt, .bat, audio, video, documents) and receive a permanent direct URL.
      </p>
    </div>

    <!-- Endpoint Card -->
    <div class="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-6 space-y-4">
      <div class="flex items-center gap-3">
        <span class="px-2.5 py-1 rounded-lg bg-orange-500 text-black font-bold text-xs uppercase">POST</span>
        <span class="text-sm sm:text-base mono font-semibold text-white">https://${domain}/api/upload</span>
      </div>
      <p class="text-xs text-zinc-400">Accepts multipart form-data, JSON with a remote URL, or Base64 data.</p>

      <div class="border-t border-zinc-800/80 pt-4 space-y-3 text-xs">
        <h4 class="font-semibold text-zinc-300 uppercase tracking-wider">Parameters</h4>
        <div class="space-y-2">
          <div class="flex items-start gap-3">
            <code class="text-orange-400 font-bold shrink-0">file</code>
            <span class="text-zinc-400">The file to upload (<code class="text-zinc-300">multipart/form-data</code>). Supports any format (e.g. <code class="text-zinc-300">.png</code>, <code class="text-zinc-300">.pdf</code>, <code class="text-zinc-300">.bat</code>, <code class="text-zinc-300">.txt</code>, <code class="text-zinc-300">.mp4</code>).</span>
          </div>
          <div class="flex items-start gap-3">
            <code class="text-orange-400 font-bold shrink-0">url</code>
            <span class="text-zinc-400">Optional remote URL (<code class="text-zinc-300">application/json</code>) to download and host directly.</span>
          </div>
          <div class="flex items-start gap-3">
            <code class="text-orange-400 font-bold shrink-0">X-API-Key</code>
            <span class="text-zinc-400">Optional header if an API key is configured on the server.</span>
          </div>
        </div>
      </div>

      <!-- JSON Response Preview -->
      <div class="border-t border-zinc-800/80 pt-4 space-y-2">
        <h4 class="text-xs font-semibold text-zinc-300 uppercase tracking-wider">Response (200 OK)</h4>
        <pre class="bg-zinc-950 p-4 rounded-xl border border-zinc-800 text-xs mono text-zinc-300 overflow-x-auto"><code>{
  "success": true,
  "url": "https://${domain}/1794849181001_81n59t.bat",
  "filename": "my_script.bat",
  "size": 1024,
  "size_formatted": "1.00 KB",
  "mime_type": "application/x-bat",
  "uploaded_at": "2026-11-16T17:40:00.000Z"
}</code></pre>
      </div>
    </div>

    <!-- Code Examples (Tabbed) -->
    <div class="space-y-4">
      <div class="flex items-center justify-between">
        <h2 class="text-lg font-bold text-white flex items-center gap-2">
          <span class="iconify text-orange-400" data-icon="lucide:code"></span>
          <span>Integration Code Snippets</span>
        </h2>
        <div class="flex gap-1.5 bg-zinc-900 p-1 rounded-xl border border-zinc-800 text-xs">
          <button onclick="showCodeTab('curl')" id="tab-btn-curl" class="px-3 py-1.5 rounded-lg bg-orange-500 text-black font-semibold">cURL</button>
          <button onclick="showCodeTab('python')" id="tab-btn-python" class="px-3 py-1.5 rounded-lg text-zinc-400 hover:text-white">Python</button>
          <button onclick="showCodeTab('js')" id="tab-btn-js" class="px-3 py-1.5 rounded-lg text-zinc-400 hover:text-white">JavaScript</button>
          <button onclick="showCodeTab('php')" id="tab-btn-php" class="px-3 py-1.5 rounded-lg text-zinc-400 hover:text-white">PHP</button>
          <button onclick="showCodeTab('go')" id="tab-btn-go" class="px-3 py-1.5 rounded-lg text-zinc-400 hover:text-white">Go</button>
        </div>
      </div>

      <div class="bg-zinc-950 border border-zinc-800 rounded-2xl p-5 relative overflow-hidden">
        <button onclick="copySnippet()" class="absolute top-4 right-4 px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-medium flex items-center gap-1.5">
          <span class="iconify" data-icon="lucide:copy"></span>
          <span>Copy</span>
        </button>
        <div class="pt-4">
          <pre id="code-curl" class="snippet-block mono text-xs text-zinc-300 overflow-x-auto leading-relaxed">curl -X POST https://${domain}/api/upload \
  -F "file=@/path/to/any_file.pdf"</pre>

          <pre id="code-python" class="snippet-block hidden mono text-xs text-zinc-300 overflow-x-auto leading-relaxed">import requests

url = "https://${domain}/api/upload"

# Upload any file: image, document, script, text
with open("script.bat", "rb") as f:
    response = requests.post(url, files={"file": f})

data = response.json()
if data.get("success"):
    print("Direct URL:", data["url"])
else:
    print("Error:", data.get("error"))</pre>

          <pre id="code-js" class="snippet-block hidden mono text-xs text-zinc-300 overflow-x-auto leading-relaxed">// Browser or Node.js fetch
const formData = new FormData();
formData.append("file", fileInput.files[0]);

const response = await fetch("https://${domain}/api/upload", {
  method: "POST",
  body: formData
});

const data = await response.json();
console.log("Direct File URL:", data.url);</pre>

          <pre id="code-php" class="snippet-block hidden mono text-xs text-zinc-300 overflow-x-auto leading-relaxed">&lt;?php
$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, "https://${domain}/api/upload");
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_POSTFIELDS, [
    "file" => new CURLFile("/path/to/script.bat")
]);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);

$data = json_decode(curl_exec($ch), true);
curl_close($ch);

echo "Direct URL: " . $data["url"];
?&gt;</pre>

          <pre id="code-go" class="snippet-block hidden mono text-xs text-zinc-300 overflow-x-auto leading-relaxed">package main

import (
	"bytes"
	"fmt"
	"io"
	"mime/multipart"
	"net/http"
	"os"
)

func main() {
	file, _ := os.Open("document.pdf")
	defer file.Close()

	body := &bytes.Buffer{}
	writer := multipart.NewWriter(body)
	part, _ := writer.CreateFormFile("file", "document.pdf")
	io.Copy(part, file)
	writer.Close()

	req, _ := http.NewRequest("POST", "https://${domain}/api/upload", body)
	req.Header.Set("Content-Type", writer.FormDataContentType())

	client := &http.Client{}
	resp, _ := client.Do(req)
	defer resp.Body.Close()

	respBody, _ := io.ReadAll(resp.Body)
	fmt.Println(string(respBody))
}</pre>
        </div>
      </div>
    </div>

    <!-- Live Interactive Tester -->
    <div class="bg-zinc-900/40 border border-zinc-800 rounded-2xl p-6 space-y-4">
      <div class="flex items-center justify-between">
        <h3 class="text-sm font-bold text-white flex items-center gap-2">
          <span class="iconify text-orange-400" data-icon="lucide:play-circle"></span>
          <span>Live API Tester</span>
        </h3>
        <span class="text-xs text-zinc-500">Test uploading from your browser</span>
      </div>

      <div class="flex flex-col sm:flex-row gap-3 items-center">
        <input type="file" id="test-file-input" class="text-xs text-zinc-400 file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-zinc-800 file:text-zinc-200 hover:file:bg-zinc-700 cursor-pointer w-full sm:w-auto" />
        <button onclick="runLiveTest()" id="test-btn" class="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-black font-semibold text-xs transition">
          Send API Request
        </button>
      </div>

      <div id="tester-output-box" class="hidden space-y-2 pt-2">
        <div class="flex items-center justify-between text-xs">
          <span class="text-zinc-400">Response Status: <span id="tester-status" class="font-bold text-green-400">200 OK</span></span>
          <button onclick="navigator.clipboard.writeText(document.getElementById('tester-json').textContent); showToast('JSON Copied!');" class="text-orange-400 hover:underline">Copy Response</button>
        </div>
        <pre class="bg-zinc-950 border border-zinc-800 rounded-xl p-4 text-xs mono text-zinc-300 overflow-x-auto"><code id="tester-json"></code></pre>
      </div>
    </div>
  </main>

  <div id="toast" class="fixed bottom-6 right-6 px-4 py-2.5 rounded-xl bg-zinc-800 text-white text-xs font-medium border border-zinc-700 shadow-2xl opacity-0 pointer-events-none transition-all duration-300 z-50">
    Copied!
  </div>

  <script>
    function showCodeTab(lang) {
      document.querySelectorAll('.snippet-block').forEach(el => el.classList.add('hidden'));
      document.getElementById('code-' + lang).classList.remove('hidden');
      ['curl', 'python', 'js', 'php', 'go'].forEach(t => {
        const btn = document.getElementById('tab-btn-' + t);
        if (t === lang) btn.className = 'px-3 py-1.5 rounded-lg bg-orange-500 text-black font-semibold';
        else btn.className = 'px-3 py-1.5 rounded-lg text-zinc-400 hover:text-white';
      });
    }

    function copySnippet() {
      const visible = document.querySelector('.snippet-block:not(.hidden)');
      if (visible) {
        navigator.clipboard.writeText(visible.textContent);
        showToast('Code copied to clipboard!');
      }
    }

    async function runLiveTest() {
      const input = document.getElementById('test-file-input');
      const btn = document.getElementById('test-btn');
      if (!input.files.length) return showToast('Please select a file to test');

      btn.disabled = true;
      btn.textContent = 'Uploading...';

      const fd = new FormData();
      fd.append('file', input.files[0]);

      try {
        const res = await fetch('/api/upload', { method: 'POST', body: fd });
        const json = await res.json();
        document.getElementById('tester-status').textContent = res.status + ' ' + res.statusText;
        document.getElementById('tester-json').textContent = JSON.stringify(json, null, 2);
        document.getElementById('tester-output-box').classList.remove('hidden');
        showToast('Request successful!');
      } catch (err) {
        showToast('Error: ' + err.message);
      } finally {
        btn.disabled = false;
        btn.textContent = 'Send API Request';
      }
    }

    function showToast(msg) {
      const toast = document.getElementById('toast');
      toast.textContent = msg;
      toast.classList.remove('opacity-0', 'pointer-events-none');
      setTimeout(() => toast.classList.add('opacity-0', 'pointer-events-none'), 2500);
    }
  </script>
</body>
</html>`;

  return new Response(html, {
    status: 200,
    headers: { 'Content-Type': 'text/html; charset=utf-8' }
  });
}



// ==========================================
// ADMIN DASHBOARD & GALLERY
// ==========================================
async function handleAdminRequest(DATABASE, request, USERNAME, PASSWORD, domain) {
  if (!authenticate(request, USERNAME, PASSWORD)) {
    return new Response('Unauthorized', { status: 401, headers: { 'WWW-Authenticate': 'Basic realm="Admin"' } });
  }
  return await generateAdminPage(DATABASE, domain);
}

async function handleAdminListKeys(DATABASE, request, USERNAME, PASSWORD) {
  if (!authenticate(request, USERNAME, PASSWORD)) {
    return new Response(JSON.stringify({ success: false, error: 'Unauthorized' }), {
      status: 401,
      headers: { 'WWW-Authenticate': 'Basic realm="Admin"', 'Content-Type': 'application/json' }
    });
  }
  if (!DATABASE) {
    return new Response(JSON.stringify({ success: false, error: 'Database not bound' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
  try {
    await ensureApiKeysTable(DATABASE);
    const result = await DATABASE.prepare('SELECT key, name, created_at, active, uploads_count FROM api_keys ORDER BY created_at DESC').all();
    return new Response(JSON.stringify({ success: true, keys: result.results || [] }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (err) {
    return new Response(JSON.stringify({ success: false, error: err.message }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
}

async function handleAdminCreateKey(DATABASE, request, USERNAME, PASSWORD) {
  if (!authenticate(request, USERNAME, PASSWORD)) {
    return new Response(JSON.stringify({ success: false, error: 'Unauthorized' }), {
      status: 401,
      headers: { 'WWW-Authenticate': 'Basic realm="Admin"', 'Content-Type': 'application/json' }
    });
  }
  if (!DATABASE) {
    return new Response(JSON.stringify({ success: false, error: 'Database not bound' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
  try {
    await ensureApiKeysTable(DATABASE);
    let name = 'Developer Key';
    try {
      const body = await request.json();
      if (body && body.name && body.name.trim()) name = body.name.trim();
    } catch {}

    const randomPart = Array.from(crypto.getRandomValues(new Uint8Array(16)))
      .map(b => b.toString(16).padStart(2, '0')).join('');
    const key = `ct_dev_${randomPart}`;
    const timestamp = Date.now();

    await DATABASE.prepare('INSERT INTO api_keys (key, name, created_at, active, uploads_count) VALUES (?, ?, ?, 1, 0)')
      .bind(key, name, timestamp).run();

    return new Response(JSON.stringify({
      success: true,
      key,
      name,
      created_at: timestamp
    }), {
      status: 201,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (err) {
    return new Response(JSON.stringify({ success: false, error: err.message }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
}

async function handleAdminDeleteKey(DATABASE, request, USERNAME, PASSWORD) {
  if (!authenticate(request, USERNAME, PASSWORD)) {
    return new Response(JSON.stringify({ success: false, error: 'Unauthorized' }), {
      status: 401,
      headers: { 'WWW-Authenticate': 'Basic realm="Admin"', 'Content-Type': 'application/json' }
    });
  }
  if (!DATABASE) {
    return new Response(JSON.stringify({ success: false, error: 'Database not bound' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
  try {
    const url = new URL(request.url);
    let keyToDelete = url.searchParams.get('key');
    if (!keyToDelete) {
      try {
        const body = await request.json();
        keyToDelete = body.key;
      } catch {}
    }
    if (!keyToDelete) {
      return new Response(JSON.stringify({ success: false, error: 'Missing key parameter' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }
    await ensureApiKeysTable(DATABASE);
    await DATABASE.prepare('DELETE FROM api_keys WHERE key = ?').bind(keyToDelete).run();
    return new Response(JSON.stringify({ success: true, message: 'Developer API key deleted' }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  } catch (err) {
    return new Response(JSON.stringify({ success: false, error: err.message }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
}

async function handleAdminMediaApiRequest(DATABASE, request, USERNAME, PASSWORD) {
  if (!authenticate(request, USERNAME, PASSWORD)) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: {
        'WWW-Authenticate': 'Basic realm="Admin"',
        'Content-Type': 'application/json'
      }
    });
  }

  try {
    const url = new URL(request.url);
    const page = parseInt(url.searchParams.get('page') || '1');
    const limit = parseInt(url.searchParams.get('limit') || '100');

    if (page < 1 || limit < 1 || limit > 500) {
      return new Response(JSON.stringify({ error: 'Invalid parameters' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const total = await getTotalMediaCount(DATABASE);
    const mediaData = await fetchMediaData(DATABASE, page, limit);
    const hasMore = (page * limit) < total;

    return new Response(JSON.stringify({
      media: mediaData,
      total: total,
      page: page,
      limit: limit,
      has_more: hasMore
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

async function getTotalMediaCount(DATABASE) {
  const result = await DATABASE.prepare('SELECT COUNT(*) as count FROM media').first();
  return result ? result.count : 0;
}

async function generateAdminPage(DATABASE, domain = 'media-hosting.dhyeyp254.workers.dev') {
  // Load only first page initially (100 items) to avoid resource limits
  const totalCount = await getTotalMediaCount(DATABASE);
  const mediaData = await fetchMediaData(DATABASE, 1, 100);
  const mediaHtml = mediaData.map(({ url }) => {
    const fileExtension = url.split('.').pop().toLowerCase();
    const timestamp = url.split('/').pop().split('.')[0];
    const mediaType = fileExtension;
    let displayUrl = url;
    const supportedImageExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'tiff', 'svg'];
    const supportedVideoExtensions = ['mp4', 'avi', 'mov', 'wmv', 'flv', 'mkv', 'webm'];
    const isSupported = [...supportedImageExtensions, ...supportedVideoExtensions].includes(fileExtension);
    const backgroundStyle = isSupported ? '' : `style="font-size: 50px; display: flex; justify-content: center; align-items: center;"`;
    const icon = isSupported ? '' : '📁';
    return `
    <div class="media-container" data-key="${url}" onclick="toggleImageSelection(this)" ${backgroundStyle}>
      <div class="media-type">${mediaType}</div>
      ${supportedVideoExtensions.includes(fileExtension) ? `
        <video class="gallery-video" preload="none" style="width: 100%; height: 100%; object-fit: contain;" controls>
          <source data-src="${displayUrl}" type="video/${fileExtension}">
          Your browser does not support the video tag。
        </video>
      ` : `
        ${isSupported ? `<img class="gallery-image lazy" data-src="${displayUrl}" alt="Image">` : icon}
      `}
      <div class="upload-time">Upload time: ${new Date(parseInt(timestamp)).toLocaleString('en-US', { timeZone: 'Asia/kolkata' })}</div>
    </div>
    `;
  }).join('');

  const html = `
    <!DOCTYPE html>
  <html>
  <head>
    <title>Gallery</title>
    <link rel="icon" href="https://p1.meituan.net/csc/c195ee91001e783f39f41ffffbbcbd484286.ico" type="image/x-icon">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
<style>
  body {
    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
    background-color: #f4f4f4;
    margin: 0;
    padding: 20px;
    transition: background-color 0.3s;
  }
  .header {
    position: sticky;
    top: 0;
    background-color: #ffffff;
    z-index: 1000;
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 20px;
    padding: 15px 20px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
    border-radius: 8px;
    flex-wrap: wrap;
    transition: box-shadow 0.3s;
  }
  .header:hover {
    box-shadow: 0 6px 16px rgba(0, 0, 0, 0.2);
  }
  .header-left {
    flex: 1;
  }
  .header-right {
    display: flex;
    gap: 10px;
    justify-content: flex-end;
    flex: 1;
    flex-wrap: wrap;
  }
  .gallery {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
    gap: 16px;
    transition: gap 0.3s;
  }
  .media-container {
    position: relative;
    overflow: hidden;
    border-radius: 12px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    aspect-ratio: 1 / 1;
    transition: transform 0.3s, box-shadow 0.3s;
    cursor: pointer;
  }
  .media-container:hover {
    transform: scale(1.05);
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.2);
  }
  .media-type {
    position: absolute;
    top: 10px;
    left: 10px;
    background-color: rgba(0, 0, 0, 0.7);
    color: white;
    padding: 5px;
    border-radius: 5px;
    font-size: 14px;
    z-index: 10;
    cursor: pointer;
    transition: background-color 0.3s;
  }
  .media-type:hover {
    background-color: rgba(0, 0, 0, 0.9);
  }
  .upload-time {
    position: absolute;
    bottom: 10px;
    left: 10px;
    background-color: rgba(255, 255, 255, 0.7);
    padding: 5px;
    border-radius: 5px;
    color: #000;
    font-size: 14px;
    z-index: 10;
    display: none;
    transition: opacity 0.3s;
  }
  .media-container:hover .upload-time {
    display: block;
    opacity: 1;
  }
  .gallery-image {
    width: 100%;
    height: 100%;
    object-fit: contain;
    transition: opacity 0.3s;
    opacity: 0;
  }
  .gallery-image.loaded {
    opacity: 1;
  }
  .media-container.selected {
    border: 2px solid #007bff;
    background-color: rgba(0, 123, 255, 0.1);
    transform: scale(1.1);
  }
  .footer {
    margin-top: 20px;
    text-align: center;
    font-size: 18px;
    color: #555;
    animation: fadeIn 1s;
  }
  .delete-button, .copy-button {
    background-color: #ff4d4d;
    color: white;
    border: none;
    border-radius: 5px;
    padding: 10px 15px;
    cursor: pointer;
    transition: background-color 0.3s, transform 0.2s;
    width: auto;
  }
  .delete-button:hover, .copy-button:hover {
    background-color: #ff1a1a;
    transform: scale(1.1);
  }
  .hidden {
    display: none;
  }
  .dropdown {
    position: relative;
    display: inline-block;
  }
  .dropdown-content {
    display: none;
    position: absolute;
    background-color: #f9f9f9;
    min-width: 160px;
    box-shadow: 0px 8px 16px 0px rgba(0,0,0,0.2);
    z-index: 1;
    border-radius: 8px;
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
    opacity: 0;
    transform: translateY(10px);
    transition: opacity 0.3s, transform 0.3s;
  }
  .dropdown:hover .dropdown-content {
    display: block;
    opacity: 1;
    transform: translateY(0);
  }
  .dropdown-content button {
    color: black;
    padding: 12px 16px;
    text-decoration: none;
    display: block;
    background: none;
    border: none;
    width: 100%;
    text-align: left;
    transition: background-color 0.3s;
  }
  .dropdown-content button:hover {
    background-color: #f1f1f1;
  }
  .loading-indicator {
    text-align: center;
    padding: 20px;
    font-size: 16px;
    color: #007bff;
  }
  .loading-indicator.hidden {
    display: none;
  }
  .end-message {
    text-align: center;
    padding: 20px;
    font-size: 16px;
    color: #666;
  }
  @media (max-width: 768px) {
    .header-left, .header-right {
      flex: 1 1 100%;
      justify-content: flex-start;
    }
    .header-right {
      margin-top: 10px;
    }
    .gallery {
      grid-template-columns: repeat(2, 1fr);
    }
  }
  /* Navigation Tabs & Developer Token Dashboard */
  .nav-tabs {
    display: flex;
    gap: 8px;
    align-items: center;
    flex-wrap: wrap;
  }
  .nav-tab {
    padding: 8px 14px;
    border-radius: 6px;
    border: 1px solid #d0d7de;
    background: #ffffff;
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s;
    color: #24292f;
  }
  .nav-tab:hover {
    background: #f6f8fa;
  }
  .nav-tab.active {
    background: #0969da;
    color: #ffffff;
    border-color: #0969da;
  }
  .nav-link {
    font-size: 13px;
    color: #0969da;
    text-decoration: none;
    font-weight: 500;
    margin-left: 6px;
  }
  .nav-link:hover {
    text-decoration: underline;
  }
  .token-section {
    max-width: 900px;
    margin: 0 auto;
    display: flex;
    flex-direction: column;
    gap: 20px;
  }
  .token-card {
    background: #ffffff;
    border-radius: 12px;
    padding: 24px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
    border: 1px solid #e1e4e8;
  }
  .token-card h3 {
    margin-top: 0;
    margin-bottom: 8px;
    font-size: 18px;
    color: #1f2328;
  }
  .token-card p {
    color: #656d76;
    font-size: 13px;
    margin-top: 0;
    margin-bottom: 16px;
  }
  .token-form {
    display: flex;
    gap: 10px;
    flex-wrap: wrap;
  }
  .token-input {
    flex: 1;
    min-width: 240px;
    padding: 10px 14px;
    border: 1px solid #d0d7de;
    border-radius: 6px;
    font-size: 14px;
    outline: none;
  }
  .token-input:focus {
    border-color: #0969da;
    box-shadow: 0 0 0 3px rgba(9, 105, 218, 0.15);
  }
  .btn-primary {
    background: #1f883d;
    color: white;
    border: none;
    border-radius: 6px;
    padding: 10px 18px;
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;
    transition: background 0.2s;
  }
  .btn-primary:hover {
    background: #1a7f37;
  }
  .token-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 13px;
  }
  .token-table th, .token-table td {
    padding: 12px;
    text-align: left;
    border-bottom: 1px solid #e1e4e8;
  }
  .token-table th {
    background: #f6f8fa;
    color: #656d76;
    font-weight: 600;
  }
  .token-code {
    font-family: monospace;
    background: #f6f8fa;
    padding: 4px 8px;
    border-radius: 4px;
    border: 1px solid #d0d7de;
    font-size: 12px;
  }
  .btn-copy-token {
    background: #f6f8fa;
    border: 1px solid #d0d7de;
    padding: 3px 8px;
    border-radius: 4px;
    cursor: pointer;
    font-size: 12px;
    margin-left: 6px;
  }
  .btn-copy-token:hover {
    background: #e1e4e8;
  }
  .btn-revoke {
    background: #cf222e;
    color: white;
    border: none;
    border-radius: 4px;
    padding: 4px 10px;
    font-size: 12px;
    cursor: pointer;
  }
  .btn-revoke:hover {
    background: #a40e26;
  }
  .new-token-alert {
    background: #dafbe1;
    border: 1px solid #4ac26b;
    color: #116329;
    padding: 14px 18px;
    border-radius: 8px;
    margin-top: 15px;
    display: none;
    font-size: 13px;
  }
  @keyframes fadeIn {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }
</style>
    <script>
    // Pagination state
    let currentPage = 1;
    let isLoading = false;
    let hasMore = true;
    let totalCount = ${totalCount};
    let loadedCount = ${mediaData.length};
    
    let selectedCount = 0;
    const selectedKeys = new Set();
    let isAllSelected = false;
  
    function toggleImageSelection(container) {
      const key = container.getAttribute('data-key');
      container.classList.toggle('selected');
      const uploadTime = container.querySelector('.upload-time');
      if (container.classList.contains('selected')) {
        selectedKeys.add(key);
        selectedCount++;
        uploadTime.style.display = 'block';
      } else {
        selectedKeys.delete(key);
        selectedCount--;
        uploadTime.style.display = 'none';
      }
      updateDeleteButton();
    }
  
    function updateDeleteButton() {
      const deleteButton = document.getElementById('delete-button');
      const countDisplay = document.getElementById('selected-count');
      countDisplay.textContent = selectedCount;
      const headerRight = document.querySelector('.header-right');
      if (selectedCount > 0) {
        headerRight.classList.remove('hidden');
      } else {
        headerRight.classList.add('hidden');
      }
    }
  
    async function deleteSelectedImages() {
      if (selectedKeys.size === 0) return;
      const confirmation = confirm('Are you sure you want to delete the selected media files? This operation cannot be undone。');
      if (!confirmation) return;
  
      const keysToDelete = Array.from(selectedKeys);
      const response = await fetch('/delete-images', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(keysToDelete)
      });
      if (response.ok) {
        alert('The selected media has been deleted');
        // Remove deleted items from DOM
        keysToDelete.forEach(key => {
          const container = document.querySelector('.media-container[data-key="' + key + '"]');
          if (container) container.remove();
        });
        // Update counters
        loadedCount -= keysToDelete.length;
        totalCount -= keysToDelete.length;
        selectedKeys.clear();
        selectedCount = 0;
        updateStats();
        updateDeleteButton();
      } else {
        alert('Deletion failed');
      }
    }
  
    function copyFormattedLinks(format) {
      const urls = Array.from(selectedKeys).map(url => url.trim()).filter(url => url !== '');
      let formattedLinks = '';
      switch (format) {
        case 'url':
          formattedLinks = urls.join('\\n\\n');
          break;
        case 'bbcode':
          formattedLinks = urls.map(url => '[img]' + url + '[/img]').join('\\n\\n');
          break;
        case 'markdown':
          formattedLinks = urls.map(url => '![image](' + url + ')').join('\\n\\n');
          break;
      }
      navigator.clipboard.writeText(formattedLinks).then(() => {
        alert('Copy Success');
      }).catch((err) => {
        alert('Copy Failure');
      });
    }
  
    function selectAllImages() {
      const mediaContainers = document.querySelectorAll('.media-container');
      if (isAllSelected) {
        mediaContainers.forEach(container => {
          container.classList.remove('selected');
          const key = container.getAttribute('data-key');
          selectedKeys.delete(key);
          container.querySelector('.upload-time').style.display = 'none';
        });
        selectedCount = 0;
      } else {
        mediaContainers.forEach(container => {
          if (!container.classList.contains('selected')) {
            container.classList.add('selected');
            const key = container.getAttribute('data-key');
            selectedKeys.add(key);
            selectedCount++;
            container.querySelector('.upload-time').style.display = 'block';
          }
        });
      }
      isAllSelected = !isAllSelected;
      updateDeleteButton();
    }
  
    function updateStats() {
      document.getElementById('loaded-count').textContent = loadedCount;
      document.getElementById('total-count').textContent = totalCount;
    }

    // Load more media function for pagination
    async function loadMoreMedia() {
      if (isLoading || !hasMore) return;
      
      isLoading = true;
      document.getElementById('loading-indicator').classList.remove('hidden');
      
      try {
        currentPage++;
        const response = await fetch('/admin/api/media?page=' + currentPage + '&limit=100');
        
        if (!response.ok) {
          throw new Error('Failed to load more media');
        }
        
        const data = await response.json();
        
        // Render new media items
        const gallery = document.querySelector('.gallery');
        data.media.forEach(item => {
          const mediaItem = createMediaElement(item.url);
          gallery.appendChild(mediaItem);
        });
        
        loadedCount += data.media.length;
        hasMore = data.has_more;
        
        updateStats();
        
        // Re-observe new items for lazy loading
        observeNewMediaItems();
        
        if (!hasMore) {
          document.getElementById('end-message').classList.remove('hidden');
        }
      } catch (error) {
        console.error('Error loading more media:', error);
        alert('Failed to load more media. Please try again.');
        currentPage--;  // Revert page increment on error
      } finally {
        isLoading = false;
        document.getElementById('loading-indicator').classList.add('hidden');
      }
    }

    function createMediaElement(url) {
      const fileExtension = url.split('.').pop().toLowerCase();
      const timestamp = url.split('/').pop().split('.')[0];
      const mediaType = fileExtension;
      const supportedImageExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'tiff', 'svg'];
      const supportedVideoExtensions = ['mp4', 'avi', 'mov', 'wmv', 'flv', 'mkv', 'webm'];
      const isSupported = [...supportedImageExtensions, ...supportedVideoExtensions].includes(fileExtension);
      
      const container = document.createElement('div');
      container.className = 'media-container';
      container.setAttribute('data-key', url);
      container.onclick = function() { toggleImageSelection(this); };
      
      if (!isSupported) {
        container.style.fontSize = '50px';
        container.style.display = 'flex';
        container.style.justifyContent = 'center';
        container.style.alignItems = 'center';
      }
      
      let mediaContent = '';
      if (supportedVideoExtensions.includes(fileExtension)) {
        mediaContent = '<video class="gallery-video" preload="none" style="width: 100%; height: 100%; object-fit: contain;" controls><source data-src="' + url + '" type="video/' + fileExtension + '">Your browser does not support the video tag。</video>';
      } else if (isSupported) {
        mediaContent = '<img class="gallery-image lazy" data-src="' + url + '" alt="Image">';
      } else {
        mediaContent = '📁';
      }
      
      container.innerHTML = '<div class="media-type">' + mediaType + '</div>' + mediaContent + '<div class="upload-time">Upload time: ' + new Date(parseInt(timestamp)).toLocaleString('en-US', { timeZone: 'Asia/kolkata' }) + '</div>';
      
      return container;
    }

    // Intersection Observer for lazy loading media
    let mediaObserver;
    function observeNewMediaItems() {
      const options = {
        root: null,
        rootMargin: '0px',
        threshold: 0.1
      };
      
      if (!mediaObserver) {
        mediaObserver = new IntersectionObserver((entries, observer) => {
          entries.forEach(entry => {
            if (entry.isIntersecting) {
              const container = entry.target;
              const video = container.querySelector('video');
              if (video) {
                const source = video.querySelector('source');
                video.src = source.getAttribute('data-src');
                video.load();
              } else {
                const img = container.querySelector('img');
                if (img && !img.src) {
                  img.src = img.getAttribute('data-src');
                  img.onload = () => img.classList.add('loaded');
                }
              }
              observer.unobserve(container);
            }
          });
        }, options);
      }
      
      const mediaContainers = document.querySelectorAll('.media-container[data-key]');
      mediaContainers.forEach(container => {
        const video = container.querySelector('video');
        const img = container.querySelector('img');
        if ((video || img) && !container.dataset.observed) {
          mediaObserver.observe(container);
          container.dataset.observed = 'true';
        }
      });
    }

    // Infinite scroll
    function checkScroll() {
      if (isLoading || !hasMore) return;
      
      const scrollPosition = window.innerHeight + window.scrollY;
      const pageHeight = document.documentElement.scrollHeight;
      
      // Load more when user is 500px from bottom
      if (scrollPosition >= pageHeight - 500) {
        loadMoreMedia();
      }
    }
  
    // Developer API Tokens Management
    function switchAdminTab(tab) {
      const galleryView = document.getElementById('view-gallery');
      const tokensView = document.getElementById('view-tokens');
      const tabGalleryBtn = document.getElementById('tab-gallery-btn');
      const tabTokensBtn = document.getElementById('tab-tokens-btn');
      const galleryActions = document.getElementById('gallery-actions');

      if (tab === 'gallery') {
        galleryView.classList.remove('hidden');
        tokensView.classList.add('hidden');
        tabGalleryBtn.classList.add('active');
        tabTokensBtn.classList.remove('active');
        if (selectedCount > 0) galleryActions.classList.remove('hidden');
      } else {
        galleryView.classList.add('hidden');
        tokensView.classList.remove('hidden');
        tabGalleryBtn.classList.remove('active');
        tabTokensBtn.classList.add('active');
        galleryActions.classList.add('hidden');
        loadApiKeys();
      }
    }

    async function loadApiKeys() {
      const tbody = document.getElementById('tokens-table-body');
      tbody.innerHTML = '<tr><td colspan="5" style="text-align: center; color: #888; padding: 20px;">Loading tokens...</td></tr>';
      try {
        const res = await fetch('/admin/api/keys');
        const data = await res.json();
        if (!data.success) throw new Error(data.error || 'Failed to load');
        if (!data.keys || data.keys.length === 0) {
          tbody.innerHTML = '<tr><td colspan="5" style="text-align: center; color: #888; padding: 20px;">No developer tokens generated yet. Click "Generate API Token" above to create one.</td></tr>';
          return;
        }
        tbody.innerHTML = data.keys.map(function(k) {
          const dateStr = new Date(k.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
          return '<tr>' +
            '<td><strong>' + escapeHtml(k.name) + '</strong></td>' +
            '<td><code class="token-code">' + escapeHtml(k.key) + '</code><button class="btn-copy-token" onclick="copyText(\\'' + escapeHtml(k.key) + '\\')">Copy</button></td>' +
            '<td>' + dateStr + '</td>' +
            '<td>' + (k.uploads_count || 0) + '</td>' +
            '<td><button class="btn-revoke" onclick="revokeApiKey(\\'' + escapeHtml(k.key) + '\\')">Revoke</button></td>' +
          '</tr>';
        }).join('');
      } catch (err) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align: center; color: #cf222e; padding: 20px;">Failed to load tokens: ' + err.message + '</td></tr>';
      }
    }

    let latestCreatedToken = '';
    async function createNewApiKey() {
      const nameInput = document.getElementById('new-token-name');
      const name = nameInput.value.trim() || 'Developer Key';
      try {
        const res = await fetch('/admin/api/keys', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: name })
        });
        const data = await res.json();
        if (!data.success) throw new Error(data.error || 'Creation failed');
        nameInput.value = '';
        latestCreatedToken = data.key;
        document.getElementById('new-token-value').textContent = data.key;
        document.getElementById('new-token-alert').style.display = 'block';
        loadApiKeys();
      } catch (err) {
        alert('Failed to generate token: ' + err.message);
      }
    }

    function copyCreatedToken() {
      if (latestCreatedToken) copyText(latestCreatedToken);
    }

    async function revokeApiKey(key) {
      if (!confirm('Are you sure you want to revoke this developer API key? Applications using it will be blocked.')) return;
      try {
        const res = await fetch('/admin/api/keys?key=' + encodeURIComponent(key), { method: 'DELETE' });
        const data = await res.json();
        if (!data.success) throw new Error(data.error || 'Revoke failed');
        loadApiKeys();
      } catch (err) {
        alert('Failed to revoke key: ' + err.message);
      }
    }

    function copyText(str) {
      navigator.clipboard.writeText(str).then(function() {
        alert('Copied to clipboard: ' + str);
      });
    }

    function escapeHtml(str) {
      if (!str) return '';
      return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
    }
  
    document.addEventListener('DOMContentLoaded', () => {
      observeNewMediaItems();
      updateStats();
      
      // Add scroll listener for infinite scroll
      window.addEventListener('scroll', checkScroll, { passive: true });
    });
  </script>
  </head>
  <body>
    <div class="header">
      <div class="header-left">
        <div class="nav-tabs">
          <button id="tab-gallery-btn" class="nav-tab active" onclick="switchAdminTab('gallery')">📁 Media Gallery (<span id="total-count">${totalCount}</span>)</button>
          <button id="tab-tokens-btn" class="nav-tab" onclick="switchAdminTab('tokens')">🔑 Developer API Tokens</button>
          <a href="/docs" target="_blank" class="nav-link">📖 API Docs &rarr;</a>
          <a href="/" target="_blank" class="nav-link">🌐 Web Uploader &rarr;</a>
        </div>
      </div>
      <div class="header-right hidden" id="gallery-actions">
        <div class="dropdown">
          <button class="copy-button">copy</button>
          <div class="dropdown-content">
            <button onclick="copyFormattedLinks('url')">URL</button>
            <button onclick="copyFormattedLinks('bbcode')">BBCode</button>
            <button onclick="copyFormattedLinks('markdown')">Markdown</button>
          </div>
        </div>
        <button id="select-all-button" class="delete-button" onclick="selectAllImages()">Select All</button>
        <button id="delete-button" class="delete-button" onclick="deleteSelectedImages()">delete</button>
      </div>
    </div>

    <!-- Gallery View -->
    <div id="view-gallery">
      <div style="margin-bottom: 15px; font-size: 13px; color: #656d76;">
        <span>Showing <span id="loaded-count">${mediaData.length}</span> of <span id="total-count-label">${totalCount}</span> files</span>
        <span style="margin-left: 15px;">Selected: <span id="selected-count">0</span> files</span>
      </div>
      <div class="gallery">
        ${mediaHtml}
      </div>
      <div id="loading-indicator" class="loading-indicator hidden">
        <p>Loading more files...</p>
      </div>
      <div id="end-message" class="end-message hidden">
        <p>✓ All files loaded</p>
      </div>
    </div>

    <!-- Developer Tokens View -->
    <div id="view-tokens" class="hidden">
      <div class="token-section">
        <!-- Create Token Card -->
        <div class="token-card">
          <h3>Issue New Developer API Token</h3>
          <p>Generate a unique API key for an external developer, mobile app, bot, or automated script.</p>
          <div class="token-form">
            <input type="text" id="new-token-name" class="token-input" placeholder="Developer / Application Name (e.g. Discord Bot, App Client)" />
            <button class="btn-primary" onclick="createNewApiKey()">Generate API Token</button>
          </div>
          <div id="new-token-alert" class="new-token-alert">
            <strong>Token Created!</strong> Make sure to copy it now:
            <div style="margin-top: 8px; display: flex; align-items: center; gap: 8px;">
              <code id="new-token-value" class="token-code" style="font-size: 14px; padding: 6px 10px;"></code>
              <button class="btn-copy-token" style="padding: 6px 12px;" onclick="copyCreatedToken()">Copy Token</button>
            </div>
          </div>
        </div>

        <!-- Active Tokens List -->
        <div class="token-card">
          <h3>Active Developer Tokens</h3>
          <p>Developers use these tokens in the <code>X-API-Key: YOUR_TOKEN</code> header or <code>?key=YOUR_TOKEN</code> parameter.</p>
          <div style="overflow-x: auto;">
            <table class="token-table">
              <thead>
                <tr>
                  <th>Name / Application</th>
                  <th>API Token</th>
                  <th>Created</th>
                  <th>Uploads</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody id="tokens-table-body">
                <tr><td colspan="5" style="text-align: center; color: #888; padding: 20px;">Loading tokens...</td></tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- Developer Integration Snippets -->
        <div class="token-card">
          <h3>Developer Upload Examples</h3>
          <p>Share these examples with developers so they can upload any file to your host:</p>
          <div style="background: #1f2328; color: #e6edf3; padding: 14px; border-radius: 8px; font-family: monospace; font-size: 12px; overflow-x: auto; margin-bottom: 10px;">
# cURL (Upload any file: image, pdf, .bat, .txt, etc.)
curl -X POST https://${domain}/api/upload \\
  -H "X-API-Key: YOUR_API_TOKEN" \\
  -F "file=@/path/to/file.pdf"
          </div>
          <div style="background: #1f2328; color: #e6edf3; padding: 14px; border-radius: 8px; font-family: monospace; font-size: 12px; overflow-x: auto;">
# Python (requests)
import requests

res = requests.post(
    "https://${domain}/api/upload",
    headers={"X-API-Key": "YOUR_API_TOKEN"},
    files={"file": open("script.bat", "rb")}
)
print("File URL:", res.json()["url"])
          </div>
        </div>
      </div>
    </div>

    <div class="footer">
      CommonThread Admin Panel
    </div>
  </body>
  </html>     
  `;
  return new Response(html, { status: 200, headers: { 'Content-Type': 'text/html; charset=utf-8' } });
}

async function fetchMediaData(DATABASE, page = 1, limit = 100) {
  // Calculate offset for pagination
  const offset = (page - 1) * limit;

  // Use LIMIT and OFFSET for efficient pagination
  const result = await DATABASE.prepare(
    'SELECT url, fileId FROM media ORDER BY url DESC LIMIT ? OFFSET ?'
  ).bind(limit, offset).all();

  const mediaData = result.results.map(row => {
    const timestamp = parseInt(row.url.split('/').pop().split('.')[0]);
    return { fileId: row.fileId, url: row.url, timestamp: timestamp };
  });

  // Sort by timestamp (newest first)
  mediaData.sort((a, b) => b.timestamp - a.timestamp);
  return mediaData.map(({ fileId, url }) => ({ fileId, url }));
}

async function handleBingImagesRequest(request) {
  const cache = caches.default;
  const cacheKey = new Request('https://raw.githubusercontent.com/Death-Walkers/image-api/main/data/images.json', {
    headers: { 'Accept': 'application/json' }
  });

  // Check for cached response
  const cachedResponse = await cache.match(cacheKey);
  if (cachedResponse) return cachedResponse;

  // Fetch data from GitHub
  const res = await fetch(cacheKey, {
    cf: {
      cacheTtl: 3600, // Cache for 1 hour in Cloudflare's edge
      cacheEverything: true,
    },
  });

  if (!res.ok) {
    return new Response('Request to GitHub API failed', { status: res.status });
  }

  // Get raw text response first
  const rawText = await res.text();
  let images = [];

  // Try to parse as JSON
  try {
    const githubData = JSON.parse(rawText);
    if (!githubData.images || !Array.isArray(githubData.images)) {
      return new Response('Invalid JSON structure: "images" array not found', { status: 400 });
    }
    images = githubData.images
      .filter(image => image && image.url)
      .map(image => ({ url: image.url }));
  } catch (jsonError) {
    // If JSON parsing fails, treat as plain text and extract URLs
    const urlRegex = /https?:\/\/[^\s]+/g;
    const matches = rawText.match(urlRegex) || [];
    images = matches
      .filter(url => /\.(jpg|jpeg|png|gif|webp|mp4|webm)$/i.test(url)) // Filter for image/video URLs
      .map(url => ({ url }));

    if (images.length === 0) {
      return new Response('No valid URLs found in response', { status: 400 });
    }
  }

  const returnData = { status: true, message: "Operation successful", data: images };
  const response = new Response(JSON.stringify(returnData), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'public, max-age=3600' // Cache for 1 hour in browsers
    }
  });

  // Cache the response
  await cache.put(cacheKey, response.clone());
  return response;
}

async function handleDeleteImagesRequest(request, DATABASE, USERNAME, PASSWORD) {
  if (!authenticate(request, USERNAME, PASSWORD)) {
    return new Response('Unauthorized', { status: 401, headers: { 'WWW-Authenticate': 'Basic realm="Admin"' } });
  }
  if (request.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 });
  }
  try {
    const keysToDelete = await request.json();
    if (!Array.isArray(keysToDelete) || keysToDelete.length === 0) {
      return new Response(JSON.stringify({ message: 'There are no items to delete' }), { status: 400 });
    }
    const placeholders = keysToDelete.map(() => '?').join(',');
    const result = await DATABASE.prepare(`DELETE FROM media WHERE url IN (${placeholders})`).bind(...keysToDelete).run();
    if (result.changes === 0) {
      return new Response(JSON.stringify({ message: 'No items found to delete' }), { status: 404 });
    }
    const cache = caches.default;
    for (const url of keysToDelete) {
      const cacheKey = new Request(url);
      const cachedResponse = await cache.match(cacheKey);
      if (cachedResponse) {
        await cache.delete(cacheKey);
      }
    }
    return new Response(JSON.stringify({ message: 'Deleted successfully' }), { status: 200 });
  } catch (error) {
    return new Response(JSON.stringify({ error: 'Deletion failed', details: error.message }), { status: 500 });
  }
}
