export default {
  async fetch(request, env) {
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, OPTIONS, DELETE',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        }
      });
    }
    
    const response = await this.handleRequest(request, env);
    const newResponse = new Response(response.body, response);
    newResponse.headers.set('Access-Control-Allow-Origin', '*');
    return newResponse;
  },

  async handleRequest(request, env) {
    const { pathname } = new URL(request.url);
    const domain = env.DOMAIN;
    const DATABASE = env.DATABASE;
    const USERNAME = env.USERNAME;
    const PASSWORD = env.PASSWORD;
    const adminPath = 'admin';
    const enableAuth = env.ENABLE_AUTH === 'true';
    const TG_BOT_TOKEN = env.TG_BOT_TOKEN;
    const TG_CHAT_ID = env.TG_CHAT_ID;
    const maxSizeMB = env.MAX_SIZE_MB ? parseInt(env.MAX_SIZE_MB, 10) : 20;
    const maxSize = maxSizeMB * 1024 * 1024;
    const Creator = 'https://t.me/Imagehostssbot';

    switch (pathname) {
      case '/':
        return await handleRootRequest(request, USERNAME, PASSWORD, enableAuth);
      case `/${adminPath}`:
        return await handleAdminRequest(DATABASE, request, USERNAME, PASSWORD);
      case '/admin/api/media':
        return await handleAdminMediaApiRequest(DATABASE, request, USERNAME, PASSWORD);
      case '/api/register':
        return request.method === 'POST' ? await handleApiRegisterRequest(request, DATABASE, domain, USERNAME, PASSWORD) : new Response('Method Not Allowed', { status: 405 });
      case '/upload':
        return request.method === 'POST' ? await handleUploadRequest(request, DATABASE, enableAuth, USERNAME, PASSWORD, domain, TG_BOT_TOKEN, TG_CHAT_ID, maxSize) : new Response('Method Not Allowed', { status: 405 });
      case '/hosturl':
        return await handleUrlUploadRequest(request, DATABASE, enableAuth, USERNAME, PASSWORD, domain, TG_BOT_TOKEN, TG_CHAT_ID, maxSize);
      case '/docs':
        return serveDocumentationPage();
      case '/wallpapers':
        return handleBingImagesRequest();
      case '/delete-images':
        return await handleDeleteImagesRequest(request, DATABASE, USERNAME, PASSWORD);
      default:
        return await handleImageRequest(request, DATABASE, TG_BOT_TOKEN);
    }
  }
};

async function serveDocumentationPage() {
  const html = `
  <html lang="en"><head>
  <meta charset="UTF-8">
  <meta name="description" content="CommonThread API Documentation - Free image and video hosting service with Telegram integration">
  <meta name="keywords" content="CommonThread, API, image hosting, video hosting, Media hosting, Telegram bot, cloud storage">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>API Documentation - CommonThread</title>
  <link rel="manifest" href="https://raw.githubusercontent.com/Itz-CommonThread/TG-MediaHost-Bot/main/Files/manifest.json">
  <link rel="icon" type="image/png" href="https://api.iconify.design/lucide:link.svg">
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600&amp;display=swap" rel="preload" as="style" onload="this.rel='stylesheet'">
  <noscript><link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600&amp;display=swap" rel="stylesheet"></noscript>
  <script src="https://cdn.tailwindcss.com"></script>
  <script src="https://code.iconify.design/3/3.1.1/iconify.min.js"></script>
</head>

<body class="min-h-screen antialiased text-zinc-100 selection:bg-orange-400/20 selection:text-orange-200" style="
    font-family: Inter, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, 'Apple Color Emoji', 'Segoe UI Emoji';
    background-color:#000;
    background-attachment: fixed;
    scroll-behavior: smooth;
    background-image:
      radial-gradient(900px 600px at 15% 10%, rgba(251, 113, 133, 0.12), transparent 60%),
      radial-gradient(900px 600px at 85% 25%, rgba(251, 146, 60, 0.12), transparent 60%),
      radial-gradient(1100px 700px at 50% 95%, rgba(217, 119, 6, 0.10), transparent 60%);
  ">

  <!-- Ambient overlay (subtle grain) -->
  <div class="pointer-events-none fixed inset-0 -z-10 opacity-40" style="background-image: radial-gradient(rgba(255,255,255,0.06) 1px, transparent 1px); background-size: 32px 32px;">
  </div>

  <!-- Page Loader -->
  <div id="page-loader" class="fixed inset-0 z-[60] flex items-center justify-center bg-black/95 backdrop-blur-md opacity-100 transition-opacity duration-500">
    <div class="group inline-flex items-center gap-3 rounded-2xl ring-1 ring-white/10 bg-zinc-950/70 px-4 py-3 shadow-2xl shadow-black/60" style="transform: translateZ(0);">
      <div class="relative">
        <img src="https://api.iconify.design/lucide:link.svg" alt="CommonThread Logo" class="h-9 w-9 rounded-full ring-1 ring-white/10">
        <div class="absolute -inset-2 rounded-full opacity-70 blur-xl" style="background: radial-gradient(circle, rgba(251,146,60,0.35), transparent 60%);">
        </div>
      </div>
      <div class="inline-flex items-center gap-2 text-zinc-200">
        <span class="iconify h-5 w-5 animate-spin" data-icon="lucide:loader-2" data-inline="false"></span>
        <span class="text-sm font-medium">Loading</span>
      </div>
    </div>
  </div>

  <!-- Scroll Progress -->
  <div class="fixed left-0 top-0 z-[55] h-0.5 w-full bg-white/5">
    <div id="scrollbar" class="h-full w-0 bg-gradient-to-r from-orange-300 via-amber-300 to-rose-300" style="box-shadow: 0 0 24px rgba(251,146,60,0.35);"></div>
  </div>

  <!-- Top Nav -->
  <header class="fixed inset-x-0 top-0 z-50">
    <nav id="top-nav" class="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 md:px-6 backdrop-blur-xl border-b border-white/10 transition-all duration-300" style="background: linear-gradient(to bottom, rgba(10,10,10,0.72), rgba(10,10,10,0.55));">
      <a href="https://media-hosting.dhyeyp254.workers.dev/" class="group inline-flex items-center gap-3 focus:outline-none focus:ring-2 focus:ring-orange-300/30 rounded-xl">
        <div class="relative">
          <img src="https://api.iconify.design/lucide:link.svg" alt="CommonThread Logo" class="h-9 w-9 rounded-full ring-1 ring-white/10">
          <div class="absolute -inset-2 rounded-full opacity-0 blur-xl transition-opacity duration-300 group-hover:opacity-100" style="background: radial-gradient(circle, rgba(251,146,60,0.45), transparent 60%);">
          </div>
        </div>
        <span class="text-lg font-semibold tracking-tight bg-gradient-to-r from-orange-200 via-amber-200 to-rose-200 bg-clip-text text-transparent">
          CommonThread
        </span>
      </a>

      <div class="hidden md:flex items-center gap-6">
        <a href="#api" class="text-sm font-medium text-zinc-300 hover:text-orange-200 hover:underline underline-offset-4 decoration-white/15 transition-colors focus:outline-none focus:ring-2 focus:ring-orange-300/30 rounded-lg px-1.5 py-1">API Docs</a>
        <a href="#telegram" class="text-sm font-medium text-zinc-300 hover:text-orange-200 hover:underline underline-offset-4 decoration-white/15 transition-colors focus:outline-none focus:ring-2 focus:ring-orange-300/30 rounded-lg px-1.5 py-1">Telegram Bot</a>
        <a href="#about" class="text-sm font-medium text-zinc-300 hover:text-orange-200 hover:underline underline-offset-4 decoration-white/15 transition-colors focus:outline-none focus:ring-2 focus:ring-orange-300/30 rounded-lg px-1.5 py-1">About</a>
      </div>

      <div class="hidden md:flex items-center gap-3">
        <a href="https://t.me/Imagehostssbot" target="_blank" class="group inline-flex items-center gap-2 rounded-full px-4 py-2 text-zinc-950 font-semibold tracking-tight ring-1 ring-white/10 shadow-lg shadow-orange-500/10 transition-all focus:outline-none focus:ring-2 focus:ring-orange-300/30" style="background: linear-gradient(90deg, rgba(251,146,60,1), rgba(253,186,116,1));">
          <span class="iconify h-4 w-4 transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" data-icon="lucide:send" data-inline="false"></span>
          <span>Upload via Bot</span>
        </a>
      </div>

      <button id="menu-toggle" class="md:hidden inline-flex items-center justify-center h-9 w-9 rounded-xl ring-1 ring-white/10 hover:ring-orange-300/30 hover:text-orange-200 transition-colors focus:outline-none focus:ring-2 focus:ring-orange-300/30" aria-label="Open navigation menu" aria-expanded="false">
        <span class="iconify h-5 w-5" data-icon="lucide:menu" data-inline="false"></span>
      </button>
    </nav>
  </header>

  <!-- Mobile Menu -->
  <div id="mobile-nav" class="fixed inset-0 z-40 hidden">
    <div id="mobile-backdrop" class="absolute inset-0 bg-black/80 backdrop-blur-md opacity-0 transition-opacity duration-300"></div>

    <div class="relative mx-auto max-w-sm px-4 pt-20">
      <div id="mobile-panel" class="rounded-2xl border border-white/10 bg-zinc-950/80 ring-1 ring-white/10 divide-y divide-white/10 opacity-0 translate-y-2 transition-all duration-300 shadow-2xl shadow-black/60" style="transform: translateZ(0);">
        <div class="p-4">
          <a href="https://media-hosting.dhyeyp254.workers.dev/" class="group inline-flex items-center gap-3 focus:outline-none focus:ring-2 focus:ring-orange-300/30 rounded-xl">
            <img src="https://api.iconify.design/lucide:link.svg" alt="CommonThread Logo" class="h-8 w-8 rounded-full ring-1 ring-white/10">
            <span class="text-base font-semibold tracking-tight bg-gradient-to-r from-orange-200 via-amber-200 to-rose-200 bg-clip-text text-transparent">
              CommonThread
            </span>
          </a>
        </div>

        <div class="p-2">
          <a href="#api" class="mobile-link block rounded-xl px-4 py-3 text-zinc-100 hover:text-orange-200 hover:bg-white/5 transition-colors focus:outline-none focus:ring-2 focus:ring-orange-300/30">API Docs</a>
          <a href="#telegram" class="mobile-link block rounded-xl px-4 py-3 text-zinc-100 hover:text-orange-200 hover:bg-white/5 transition-colors focus:outline-none focus:ring-2 focus:ring-orange-300/30">Telegram Bot</a>
          <a href="#about" class="mobile-link block rounded-xl px-4 py-3 text-zinc-100 hover:text-orange-200 hover:bg-white/5 transition-colors focus:outline-none focus:ring-2 focus:ring-orange-300/30">About</a>
        </div>

        <div class="p-4">
          <a href="https://t.me/Imagehostssbot" target="_blank" class="mobile-link inline-flex w-full items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-zinc-950 font-semibold tracking-tight ring-1 ring-white/10 shadow-lg shadow-orange-500/10 transition-all focus:outline-none focus:ring-2 focus:ring-orange-300/30" style="background: linear-gradient(90deg, rgba(251,146,60,1), rgba(253,186,116,1));">
            <span class="iconify h-4 w-4" data-icon="lucide:send" data-inline="false"></span>
            <span>Upload via Bot</span>
          </a>
        </div>
      </div>
    </div>
  </div>

  <!-- Floating action: Back to top -->
  <button id="to-top" class="fixed bottom-5 right-5 z-40 hidden items-center gap-2 rounded-full px-3 py-2 text-xs font-medium text-zinc-200 ring-1 ring-white/10 bg-zinc-950/60 backdrop-blur-md shadow-lg shadow-black/50 hover:bg-zinc-950/75 hover:text-orange-200 transition-all focus:outline-none focus:ring-2 focus:ring-orange-300/30">
    <span class="iconify h-4 w-4" data-icon="lucide:arrow-up" data-inline="false"></span>
    Top
  </button>

  <main class="pt-24">
    <!-- Hero -->
    <section class="mx-auto max-w-4xl px-4 text-center md:px-6" data-reveal="">
      <div class="inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-medium text-orange-200 ring-1 ring-orange-300/20 bg-orange-500/10">
        <span class="iconify h-3.5 w-3.5" data-icon="lucide:sparkles" data-inline="false"></span>
        <span>CommonThread</span>
      </div>

      <h1 class="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl md:text-5xl bg-gradient-to-r from-orange-200 via-amber-200 to-rose-200 bg-clip-text text-transparent">
        CommonThread API Documentation
      </h1>

      <p class="mt-4 text-sm text-zinc-400 sm:text-base">
        Free, fast, and reliable media hosting service with Telegram integration. Upload images and videos directly or via URL with our simple API.
      </p>

      <div class="mt-6 flex flex-wrap justify-center gap-3">
        <a href="#api" class="group inline-flex items-center gap-2 rounded-full px-4 py-2.5 text-zinc-950 font-semibold tracking-tight ring-1 ring-white/10 shadow-lg shadow-orange-500/10 transition-all focus:outline-none focus:ring-2 focus:ring-orange-300/30" style="background: linear-gradient(90deg, rgba(251,146,60,1), rgba(253,186,116,1));">
          <span class="iconify h-4 w-4 transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" data-icon="lucide:code-2" data-inline="false"></span>
          <span>View API Docs</span>
        </a>

        <a href="https://t.me/Imagehostssbot" target="_blank" class="group inline-flex items-center gap-2 rounded-full bg-white/5 px-4 py-2.5 text-zinc-100 font-medium ring-1 ring-white/10 hover:bg-white/8 transition-all focus:outline-none focus:ring-2 focus:ring-orange-300/30">
          <span class="iconify h-4 w-4 transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" data-icon="lucide:send" data-inline="false"></span>
          <span>Try Telegram Bot</span>
        </a>
      </div>

      <div class="mt-8 mx-auto max-w-3xl rounded-2xl border border-white/10 bg-white/[0.03] ring-1 ring-white/10 backdrop-blur-md p-4 sm:p-5 text-left" style="box-shadow: 0 20px 80px rgba(0,0,0,0.65);">
        <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div class="flex items-center gap-2 text-sm text-zinc-300">
            <span class="iconify h-4 w-4 text-orange-200" data-icon="lucide:link" data-inline="false"></span>
            <span class="font-medium text-zinc-100">Quick Start:</span>
            <span class="text-zinc-400">Upload a file with</span>
            <code class="rounded bg-black/60 px-2 py-0.5 text-xs text-orange-200 ring-1 ring-white/10">POST /upload</code>
          </div>
          <a href="#api" class="text-sm font-medium text-orange-200 hover:text-orange-100 underline underline-offset-4 decoration-white/15">Jump to endpoints</a>
        </div>
      </div>
    </section>

    <!-- Feature Cards -->
    <section class="mx-auto mt-10 max-w-6xl px-4 md:px-6">
      <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div class="group rounded-2xl border border-white/10 bg-white/[0.03] p-6 ring-1 ring-white/10 transition-all duration-300 hover:-translate-y-1 hover:bg-white/[0.05]" style="box-shadow: 0 20px 80px rgba(0,0,0,0.35);" data-reveal="">
          <div class="flex flex-col items-center text-center">
            <div class="mb-3 inline-flex h-12 w-12 items-center justify-center rounded-xl ring-1 ring-orange-300/20 bg-orange-500/10 text-orange-200 transition-transform duration-300 group-hover:scale-105">
              <span class="iconify h-6 w-6" data-icon="lucide:zap" data-inline="false"></span>
            </div>
            <h4 class="text-lg font-medium text-white">Fast Uploads</h4>
            <p class="mt-2 text-sm text-zinc-400">Upload and retrieve your media files in seconds with our optimized infrastructure.</p>
          </div>
        </div>

        <div class="group rounded-2xl border border-white/10 bg-white/[0.03] p-6 ring-1 ring-white/10 transition-all duration-300 hover:-translate-y-1 hover:bg-white/[0.05]" style="box-shadow: 0 20px 80px rgba(0,0,0,0.35);" data-reveal="">
          <div class="flex flex-col items-center text-center">
            <div class="mb-3 inline-flex h-12 w-12 items-center justify-center rounded-xl ring-1 ring-orange-300/20 bg-orange-500/10 text-orange-200 transition-transform duration-300 group-hover:scale-105">
              <span class="iconify h-6 w-6" data-icon="lucide:shield" data-inline="false"></span>
            </div>
            <h4 class="text-lg font-medium text-white">Secure Storage</h4>
            <p class="mt-2 text-sm text-zinc-400">Your files are stored securely using Telegram's robust cloud storage infrastructure.</p>
          </div>
        </div>

        <div class="group rounded-2xl border border-white/10 bg-white/[0.03] p-6 ring-1 ring-white/10 transition-all duration-300 hover:-translate-y-1 hover:bg-white/[0.05]" style="box-shadow: 0 20px 80px rgba(0,0,0,0.35);" data-reveal="">
          <div class="flex flex-col items-center text-center">
            <div class="mb-3 inline-flex h-12 w-12 items-center justify-center rounded-xl ring-1 ring-orange-300/20 bg-orange-500/10 text-orange-200 transition-transform duration-300 group-hover:scale-105">
              <span class="iconify h-6 w-6" data-icon="lucide:bot" data-inline="false"></span>
            </div>
            <h4 class="text-lg font-medium text-white">Telegram Integration</h4>
            <p class="mt-2 text-sm text-zinc-400">Upload files directly from Telegram using our dedicated bot for seamless integration.</p>
          </div>
        </div>
      </div>
    </section>

    <!-- API Docs -->
    <section id="api" class="scroll-mt-24 mx-auto mt-10 max-w-6xl px-4 md:px-6">
      <div class="rounded-3xl border border-white/10 bg-white/[0.03] backdrop-blur-xl ring-1 ring-white/10 shadow-2xl shadow-black/60" style="transform: translateZ(0);" data-reveal="">
        <div class="p-6 sm:p-8">
          <div class="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h2 class="text-2xl font-semibold tracking-tight text-orange-200 sm:text-3xl">API Documentation</h2>
              <div class="mt-2 inline-flex items-center gap-2 text-sm text-zinc-400">
                <span class="iconify h-4 w-4" data-icon="lucide:clock" data-inline="false"></span>
                <span><span class="font-medium text-zinc-300">Last Updated:</span> July 20, 2025</span>
              </div>
            </div>

            <div class="flex flex-wrap items-center gap-2">
              <button id="expand-all" class="inline-flex items-center gap-2 rounded-full bg-white/5 px-3 py-2 text-xs font-medium text-zinc-200 ring-1 ring-white/10 hover:bg-white/10 transition-colors focus:outline-none focus:ring-2 focus:ring-orange-300/30">
                <span class="iconify h-4 w-4" data-icon="lucide:unfold-vertical" data-inline="false"></span>
                Expand all
              </button>
              <button id="collapse-all" class="inline-flex items-center gap-2 rounded-full bg-white/5 px-3 py-2 text-xs font-medium text-zinc-200 ring-1 ring-white/10 hover:bg-white/10 transition-colors focus:outline-none focus:ring-2 focus:ring-orange-300/30">
                <span class="iconify h-4 w-4" data-icon="lucide:fold-vertical" data-inline="false"></span>
                Collapse all
              </button>
            </div>
          </div>

          <p class="mt-4 text-sm text-zinc-300 sm:text-base">
            This documentation provides a comprehensive guide on how to use the <span class="font-medium">CommonThread API</span> to upload media files to the platform.
          </p>

          <!-- Endpoints -->
          <div class="mt-6 rounded-2xl border border-white/10 bg-black/20 ring-1 ring-white/10">
            <button class="section-toggle w-full flex items-center justify-between gap-3 px-4 py-3 sm:px-5 sm:py-4" data-target="#endpoints-panel" aria-expanded="true">
              <div class="flex items-center gap-2">
                <span class="iconify h-4 w-4 text-orange-200" data-icon="lucide:route" data-inline="false"></span>
                <h3 class="text-lg font-medium text-amber-200">Endpoints</h3>
              </div>
              <span class="iconify chevron h-4 w-4 text-zinc-300 transition-transform duration-300" data-icon="lucide:chevron-down" data-inline="false"></span>
            </button>
            <div id="endpoints-panel" class="section-panel px-4 pb-4 sm:px-5 sm:pb-5">
              <ul class="mt-1 space-y-2 text-zinc-300">
                <li class="text-sm">
                  <span class="font-medium text-white">POST</span>
                  <code class="mx-1 rounded bg-orange-500/15 px-1.5 py-0.5 text-orange-200 ring-1 ring-orange-300/10">/upload</code>
                  - Direct file upload via form data.
                </li>
                <li class="text-sm">
                  <span class="font-medium text-white">GET</span>
                  <code class="mx-1 rounded bg-orange-500/15 px-1.5 py-0.5 text-orange-200 ring-1 ring-orange-300/10">/hosturl?url=[media_url]</code>
                  - Uploads media from a specified URL.
                </li>
              </ul>
            </div>
          </div>

          <!-- Base URLs -->
          <div class="mt-4 rounded-2xl border border-white/10 bg-black/20 ring-1 ring-white/10">
            <button class="section-toggle w-full flex items-center justify-between gap-3 px-4 py-3 sm:px-5 sm:py-4" data-target="#baseurls-panel" aria-expanded="true">
              <div class="flex items-center gap-2">
                <span class="iconify h-4 w-4 text-orange-200" data-icon="lucide:globe" data-inline="false"></span>
                <h3 class="text-lg font-medium text-amber-200">Base URLs</h3>
              </div>
              <span class="iconify chevron h-4 w-4 text-zinc-300 transition-transform duration-300" data-icon="lucide:chevron-down" data-inline="false"></span>
            </button>
            <div id="baseurls-panel" class="section-panel px-4 pb-4 sm:px-5 sm:pb-5">
              <ul class="mt-1 space-y-2 text-zinc-300">
                <li class="text-sm">
                  <span class="font-medium text-white">POST:</span>
                  <code class="mx-1 rounded bg-orange-500/15 px-1.5 py-0.5 text-orange-200 ring-1 ring-orange-300/10">https://media-hosting.dhyeyp254.workers.dev/upload</code>
                </li>
                <li class="text-sm">
                  <span class="font-medium text-white">GET:</span>
                  <code class="mx-1 rounded bg-orange-500/15 px-1.5 py-0.5 text-orange-200 ring-1 ring-orange-300/10">https://media-hosting.dhyeyp254.workers.dev/hosturl?url=[media_url]</code>
                </li>
              </ul>
            </div>
          </div>

          <!-- POST Method -->
          <div class="mt-4 rounded-2xl border border-white/10 bg-black/20 ring-1 ring-white/10">
            <button class="section-toggle w-full flex items-center justify-between gap-3 px-4 py-3 sm:px-5 sm:py-4" data-target="#post-panel" aria-expanded="true">
              <div class="flex items-center gap-2">
                <span class="iconify h-4 w-4 text-orange-200" data-icon="lucide:upload" data-inline="false"></span>
                <h3 class="text-lg font-medium text-amber-200">POST Method</h3>
              </div>
              <span class="iconify chevron h-4 w-4 text-zinc-300 transition-transform duration-300" data-icon="lucide:chevron-down" data-inline="false"></span>
            </button>
            <div id="post-panel" class="section-panel px-4 pb-4 sm:px-5 sm:pb-5">
              <p class="mt-1 text-sm text-zinc-300 sm:text-base">
                Uploads a media file (image, video, or any other type of media) directly using multipart/form-data. This method is ideal for client-side form submissions.
              </p>
              <p class="mt-2 text-sm text-zinc-300 sm:text-base">
                <span class="font-medium">Header:</span>
                <code class="mx-1 rounded bg-orange-500/15 px-1.5 py-0.5 text-orange-200 ring-1 ring-orange-300/10">Content-Type: multipart/form-data</code>
                (Required)
              </p>

              <h4 class="mt-4 text-base font-medium text-white">Form Data Parameters</h4>
              <div class="mt-2 overflow-x-auto rounded-xl ring-1 ring-white/10 border border-white/10">
                <table class="min-w-[720px] w-full text-left text-sm">
                  <thead class="text-zinc-100" style="background: linear-gradient(90deg, rgba(251,146,60,0.22), rgba(244,63,94,0.16));">
                    <tr>
                      <th class="px-4 py-3 font-medium">Parameter</th>
                      <th class="px-4 py-3 font-medium">Type</th>
                      <th class="px-4 py-3 font-medium">Required</th>
                      <th class="px-4 py-3 font-medium">Description</th>
                    </tr>
                  </thead>
                  <tbody class="divide-y divide-white/10">
                    <tr class="bg-white/[0.03]">
                      <td class="px-4 py-3">
                        <code class="rounded bg-orange-500/15 px-1.5 py-0.5 text-orange-200 ring-1 ring-orange-300/10">file</code>
                      </td>
                      <td class="px-4 py-3 text-zinc-300">file</td>
                      <td class="px-4 py-3 text-zinc-300">Yes</td>
                      <td class="px-4 py-3 text-zinc-300">The media file to be uploaded (image, video, or any other type of media). Must not exceed 20MB in size.</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <h4 class="mt-6 text-base font-medium text-white">Usage Example (cURL)</h4>
              <div class="relative mt-2">
                <pre class="rounded-xl bg-black/55 p-4 text-orange-100 ring-1 ring-white/10 overflow-x-auto text-xs sm:text-sm" style="box-shadow: inset 0 0 0 1px rgba(255,255,255,0.06);"><code id="bash-code">curl -X POST https://media-hosting.dhyeyp254.workers.dev/upload \
  -H "Content-Type: multipart/form-data" \
  -F "file=@path/to/your/file.jpg"</code></pre>
                <button data-copy="#bash-code" class="copy-btn absolute top-2 right-2 inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-zinc-950 ring-1 ring-white/10 shadow-sm shadow-orange-500/10 hover:shadow-orange-500/20 transition-all focus:outline-none focus:ring-2 focus:ring-orange-300/30" style="background: linear-gradient(90deg, rgba(251,146,60,1), rgba(253,186,116,1));">
                  <span class="iconify h-3.5 w-3.5" data-icon="lucide:copy" data-inline="false"></span>
                  Copy
                </button>
              </div>

              <h4 class="mt-6 text-base font-medium text-white">Usage Example (JavaScript - Fetch API)</h4>
              <div class="relative mt-2">
                <pre class="rounded-xl bg-black/55 p-4 text-orange-100 ring-1 ring-white/10 overflow-x-auto text-xs sm:text-sm" style="box-shadow: inset 0 0 0 1px rgba(255,255,255,0.06);"><code id="js-code">const fileInput = document.querySelector('input[type="file"]');
  const formData = new FormData();
  formData.append('file', fileInput.files[0]);

  fetch('https://media-hosting.dhyeyp254.workers.dev/upload', {
    method: 'POST',
    body: formData
  })
  .then(response =&gt; response.json())
  .then(data =&gt; console.log(data))
  .catch(error =&gt; console.error('Error:', error));</code></pre>
                <button data-copy="#js-code" class="copy-btn absolute top-2 right-2 inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-zinc-950 ring-1 ring-white/10 shadow-sm shadow-orange-500/10 hover:shadow-orange-500/20 transition-all focus:outline-none focus:ring-2 focus:ring-orange-300/30" style="background: linear-gradient(90deg, rgba(251,146,60,1), rgba(253,186,116,1));">
                  <span class="iconify h-3.5 w-3.5" data-icon="lucide:copy" data-inline="false"></span>
                  Copy
                </button>
              </div>
            </div>
          </div>

          <!-- GET Method -->
          <div class="mt-4 rounded-2xl border border-white/10 bg-black/20 ring-1 ring-white/10">
            <button class="section-toggle w-full flex items-center justify-between gap-3 px-4 py-3 sm:px-5 sm:py-4" data-target="#get-panel" aria-expanded="true">
              <div class="flex items-center gap-2">
                <span class="iconify h-4 w-4 text-orange-200" data-icon="lucide:download" data-inline="false"></span>
                <h3 class="text-lg font-medium text-amber-200">GET Method</h3>
              </div>
              <span class="iconify chevron h-4 w-4 text-zinc-300 transition-transform duration-300" data-icon="lucide:chevron-down" data-inline="false"></span>
            </button>
            <div id="get-panel" class="section-panel px-4 pb-4 sm:px-5 sm:pb-5">
              <p class="mt-1 text-sm text-zinc-300 sm:text-base">
                Fetches and uploads media from a provided URL. This method is suitable for uploading media files already hosted online.
              </p>
              <p class="mt-2 text-sm text-zinc-300 sm:text-base">
                <span class="font-medium">Usage:</span>
                <code class="mx-1 rounded bg-orange-500/15 px-1.5 py-0.5 text-orange-200 ring-1 ring-orange-300/10">GET /hosturl?url=[media_url]</code>
              </p>

              <h4 class="mt-4 text-base font-medium text-white">Parameters</h4>
              <div class="mt-2 overflow-x-auto rounded-xl ring-1 ring-white/10 border border-white/10">
                <table class="min-w-[720px] w-full text-left text-sm">
                  <thead class="text-zinc-100" style="background: linear-gradient(90deg, rgba(251,146,60,0.22), rgba(244,63,94,0.16));">
                    <tr>
                      <th class="px-4 py-3 font-medium">Parameter</th>
                      <th class="px-4 py-3 font-medium">Type</th>
                      <th class="px-4 py-3 font-medium">Required</th>
                      <th class="px-4 py-3 font-medium">Description</th>
                    </tr>
                  </thead>
                  <tbody class="divide-y divide-white/10">
                    <tr class="bg-white/[0.03]">
                      <td class="px-4 py-3">
                        <code class="rounded bg-orange-500/15 px-1.5 py-0.5 text-orange-200 ring-1 ring-orange-300/10">url</code>
                      </td>
                      <td class="px-4 py-3 text-zinc-300">string</td>
                      <td class="px-4 py-3 text-zinc-300">Yes</td>
                      <td class="px-4 py-3 text-zinc-300">The URL of the media file to upload (image or video, max 20MB).</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <h4 class="mt-6 text-base font-medium text-white">Usage Example</h4>
              <div class="relative mt-2">
                <pre class="rounded-xl bg-black/55 p-4 text-orange-100 ring-1 ring-white/10 overflow-x-auto text-xs sm:text-sm" style="box-shadow: inset 0 0 0 1px rgba(255,255,255,0.06);"><code id="bash-get-code">https://media-hosting.dhyeyp254.workers.dev/hosturl?url=https://example.com/path/to/media.jpg</code></pre>
                <button data-copy="#bash-get-code" class="copy-btn absolute top-2 right-2 inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-zinc-950 ring-1 ring-white/10 shadow-sm shadow-orange-500/10 hover:shadow-orange-500/20 transition-all focus:outline-none focus:ring-2 focus:ring-orange-300/30" style="background: linear-gradient(90deg, rgba(251,146,60,1), rgba(253,186,116,1));">
                  <span class="iconify h-3.5 w-3.5" data-icon="lucide:copy" data-inline="false"></span>
                  Copy
                </button>
              </div>
            </div>
          </div>

          <!-- Responses -->
          <div class="mt-4 rounded-2xl border border-white/10 bg-black/20 ring-1 ring-white/10">
            <button class="section-toggle w-full flex items-center justify-between gap-3 px-4 py-3 sm:px-5 sm:py-4" data-target="#responses-panel" aria-expanded="true">
              <div class="flex items-center gap-2">
                <span class="iconify h-4 w-4 text-orange-200" data-icon="lucide:braces" data-inline="false"></span>
                <h3 class="text-lg font-medium text-amber-200">Response Formats</h3>
              </div>
              <span class="iconify chevron h-4 w-4 text-zinc-300 transition-transform duration-300" data-icon="lucide:chevron-down" data-inline="false"></span>
            </button>

            <div id="responses-panel" class="section-panel px-4 pb-4 sm:px-5 sm:pb-5">
              <h3 class="mt-2 text-lg font-medium text-amber-200">Response Format (Success)</h3>
              <p class="mt-2 text-sm text-zinc-300 sm:text-base">A successful upload will return a JSON object with the following details:</p>
              <div class="relative mt-2">
                <pre class="rounded-xl bg-black/55 p-4 text-orange-100 ring-1 ring-white/10 overflow-x-auto text-xs sm:text-sm" style="box-shadow: inset 0 0 0 1px rgba(255,255,255,0.06);"><code id="success-response-code">{
    "data": "https://media-hosting.dhyeyp254.workers.dev/1753020712833.png",
    "url": "https://media-hosting.dhyeyp254.workers.dev/1753020712833.png",
    "filename": "2nNV2I4.png",
    "size": 83638,
    "uploaded_on": "2025-07-20T14:11:52.833Z",
    "media_type": "image/png",
    "creator": "https://t.me/Imagehostssbot"
  }</code></pre>
                <button data-copy="#success-response-code" class="copy-btn absolute top-2 right-2 inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-zinc-950 ring-1 ring-white/10 shadow-sm shadow-orange-500/10 hover:shadow-orange-500/20 transition-all focus:outline-none focus:ring-2 focus:ring-orange-300/30" style="background: linear-gradient(90deg, rgba(251,146,60,1), rgba(253,186,116,1));">
                  <span class="iconify h-3.5 w-3.5" data-icon="lucide:copy" data-inline="false"></span>
                  Copy
                </button>
              </div>

              <ul class="mt-3 space-y-1 text-sm text-zinc-300">
                <li><code class="rounded bg-orange-500/15 px-1.5 py-0.5 text-orange-200 ring-1 ring-orange-300/10">data</code>: The direct URL of the uploaded media file.</li>
                <li><code class="rounded bg-orange-500/15 px-1.5 py-0.5 text-orange-200 ring-1 ring-orange-300/10">url</code>: (Alias for <code class="rounded bg-orange-500/15 px-1 py-0.5 text-orange-200 ring-1 ring-orange-300/10">data</code>) The direct URL of the uploaded media file.</li>
                <li><code class="rounded bg-orange-500/15 px-1.5 py-0.5 text-orange-200 ring-1 ring-orange-300/10">filename</code>: The original filename of the uploaded media.</li>
                <li><code class="rounded bg-orange-500/15 px-1.5 py-0.5 text-orange-200 ring-1 ring-orange-300/10">size</code>: The size of the uploaded file in bytes.</li>
                <li><code class="rounded bg-orange-500/15 px-1.5 py-0.5 text-orange-200 ring-1 ring-orange-300/10">uploaded_on</code>: The timestamp when the file was uploaded (ISO 8601 format).</li>
                <li><code class="rounded bg-orange-500/15 px-1.5 py-0.5 text-orange-200 ring-1 ring-orange-300/10">media_type</code>: The MIME type of the uploaded media (e.g., 'image/png', 'video/mp4').</li>
                <li><code class="rounded bg-orange-500/15 px-1.5 py-0.5 text-orange-200 ring-1 ring-orange-300/10">creator</code>: A link to the creator's Telegram channel.</li>
              </ul>

              <h3 class="mt-8 text-lg font-medium text-amber-200">Response Format (Error)</h3>
              <p class="mt-2 text-sm text-zinc-300 sm:text-base">
                In case of an error, especially with the <code class="rounded bg-orange-500/15 px-1 py-0.5 text-orange-200 ring-1 ring-orange-300/10">url</code> parameter for the GET method, an error JSON object will be returned:
              </p>
              <div class="relative mt-2">
                <pre class="rounded-xl bg-black/55 p-4 text-orange-100 ring-1 ring-white/10 overflow-x-auto text-xs sm:text-sm" style="box-shadow: inset 0 0 0 1px rgba(255,255,255,0.06);"><code id="error-response-code">{
    "error": "Failed to download file from URL"
  }</code></pre>
                <button data-copy="#error-response-code" class="copy-btn absolute top-2 right-2 inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-zinc-950 ring-1 ring-white/10 shadow-sm shadow-orange-500/10 hover:shadow-orange-500/20 transition-all focus:outline-none focus:ring-2 focus:ring-orange-300/30" style="background: linear-gradient(90deg, rgba(251,146,60,1), rgba(253,186,116,1));">
                  <span class="iconify h-3.5 w-3.5" data-icon="lucide:copy" data-inline="false"></span>
                  Copy
                </button>
              </div>
            </div>
          </div>

          <!-- Notes -->
          <div class="mt-4 rounded-2xl border border-white/10 bg-black/20 ring-1 ring-white/10">
            <button class="section-toggle w-full flex items-center justify-between gap-3 px-4 py-3 sm:px-5 sm:py-4" data-target="#notes-panel" aria-expanded="true">
              <div class="flex items-center gap-2">
                <span class="iconify h-4 w-4 text-orange-200" data-icon="lucide:sticky-note" data-inline="false"></span>
                <h3 class="text-lg font-medium text-amber-200">Notes</h3>
              </div>
              <span class="iconify chevron h-4 w-4 text-zinc-300 transition-transform duration-300" data-icon="lucide:chevron-down" data-inline="false"></span>
            </button>
            <div id="notes-panel" class="section-panel px-4 pb-4 sm:px-5 sm:pb-5">
              <ul class="mt-1 space-y-2 text-sm text-zinc-300">
                <li><span class="font-medium">POST Method:</span> Best for uploading files directly from user input (e.g., via an HTML form).</li>
                <li><span class="font-medium">GET Method:</span> Ideal for programmatically uploading files that are already accessible via a public URL.</li>
                <li>All uploaded media is subject to a <span class="font-medium text-white">20MB file size limit</span>.</li>
              </ul>
            </div>
          </div>

        </div>
      </div>
    </section>

    <!-- Telegram -->
    <section id="telegram" class="scroll-mt-24 mx-auto mt-10 max-w-6xl px-4 md:px-6">
      <div class="rounded-3xl border border-orange-300/15 bg-white/[0.03] ring-1 ring-white/10 shadow-2xl shadow-black/55" style="transform: translateZ(0);" data-reveal="">
        <div class="p-6 sm:p-8">
          <h2 class="text-2xl font-semibold tracking-tight text-orange-200 sm:text-3xl">Telegram Bot Integration</h2>
          <p class="mt-3 text-sm text-zinc-300 sm:text-base">
            Now you can directly upload media to CommonThread using our dedicated Telegram bot
            <strong><a href="https://t.me/Imagehostssbot" target="_blank" class="text-orange-200 hover:text-orange-100 underline underline-offset-4 decoration-white/15">@Imagehostssbot</a></strong>.
            This offers a convenient way to host files without needing to interact directly with the API.
          </p>

          <h3 class="mt-6 text-lg font-medium text-amber-200">How to Use the Telegram Bot</h3>
          <ol class="mt-2 list-decimal pl-5 space-y-2 text-sm text-zinc-300 sm:text-base">
            <li>Start a chat with <a href="https://t.me/Imagehostssbot" target="_blank" class="text-orange-200 hover:text-orange-100 underline underline-offset-4 decoration-white/15">@Imagehostssbot</a> on Telegram.</li>
            <li><strong class="text-white">Direct File Upload:</strong> Send any image, video, or media file directly to the bot.</li>
            <li><strong class="text-white">URL Upload:</strong> Alternatively, send a URL containing a media file. Our bot will automatically download and upload it for you.</li>
            <li>The bot will process your request and return the direct CommonThread URL for your uploaded media.</li>
          </ol>

          <h3 class="mt-6 text-lg font-medium text-amber-200">Bot Commands</h3>
          <div class="mt-2 overflow-x-auto rounded-xl ring-1 ring-white/10 border border-white/10">
            <table class="min-w-[560px] w-full text-left text-sm">
              <thead class="text-zinc-100" style="background: linear-gradient(90deg, rgba(251,146,60,0.22), rgba(244,63,94,0.16));">
                <tr>
                  <th class="px-4 py-3 font-medium">Command</th>
                  <th class="px-4 py-3 font-medium">Description</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-white/10">
                <tr class="bg-white/[0.03]">
                  <td class="px-4 py-3"><code class="rounded bg-orange-500/15 px-1.5 py-0.5 text-orange-200 ring-1 ring-orange-300/10">/start</code></td>
                  <td class="px-4 py-3 text-zinc-300">Get a welcome message and basic instructions.</td>
                </tr>
                <tr class="bg-white/[0.03]">
                  <td class="px-4 py-3"><code class="rounded bg-orange-500/15 px-1.5 py-0.5 text-orange-200 ring-1 ring-orange-300/10">/help</code></td>
                  <td class="px-4 py-3 text-zinc-300">Show detailed help information and available features.</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div class="mt-6 flex flex-wrap gap-3">
            <a href="https://t.me/Imagehostssbot" target="_blank" class="group inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-zinc-950 font-semibold tracking-tight ring-1 ring-white/10 shadow-lg shadow-orange-500/10 transition-all focus:outline-none focus:ring-2 focus:ring-orange-300/30" style="background: linear-gradient(90deg, rgba(251,146,60,1), rgba(253,186,116,1));">
              <span class="iconify h-4 w-4 transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" data-icon="lucide:send" data-inline="false"></span>
              <span>Start Using the Bot</span>
            </a>
          </div>
        </div>
      </div>
    </section>

    <!-- About -->
    <section id="about" class="scroll-mt-24 mx-auto mt-10 mb-16 max-w-6xl px-4 md:px-6">
      <div class="rounded-3xl border border-white/10 bg-white/[0.03] backdrop-blur-xl ring-1 ring-white/10 shadow-2xl shadow-black/55" style="transform: translateZ(0);" data-reveal="">
        <div class="p-6 sm:p-8">
          <h2 class="text-2xl font-semibold tracking-tight text-orange-200 sm:text-3xl">About Us</h2>
          <div class="mt-3 space-y-3 text-sm text-zinc-300 sm:text-base">
            <p>Welcome to <strong class="text-white">CommonThread</strong> — your trusted platform for free image, video, and general media hosting. Designed with an emphasis on <strong class="text-white">simplicity, speed, and security</strong>, CommonThread offers a seamless and efficient experience for uploading and sharing your digital content. Developed by <strong class="text-white">CommonThread</strong>, our service is built on a foundation of robust privacy protections to ensure your data remains safe and secure.</p>
            <p>Our platform leverages Telegram's cutting-edge cloud storage infrastructure, providing you with reliable and easily accessible media storage, whenever and wherever you need it.</p>
            <p><strong class="text-white">About CommonThread:</strong> CommonThread is a dynamic Telegram channel managed by Aarabh (known as CommonThread Team), who specializes in developing advanced Telegram bots, powerful APIs, and innovative web applications. You can explore all the latest tools, projects, and updates directly on their Telegram channel: <a href="https://t.me/Imagehostssbot" target="_blank" class="text-orange-200 hover:text-orange-100 underline underline-offset-4 decoration-white/15">CommonThread</a>.</p>
            <p><strong class="text-white">Disclaimer:</strong> CommonThread is an independent project created solely for educational and demonstrative purposes and is not affiliated with or endorsed by Telegram. Users are solely responsible for the content they upload; CommonThread does not claim any rights over user-uploaded media. By using our platform, users agree that they retain all responsibility for compliance with relevant copyright laws and regulations.</p>
          </div>
        </div>
      </div>
    </section>
  </main>

  <!-- Footer -->
  <footer class="border-t border-white/10">
    <div class="mx-auto max-w-7xl px-4 py-6 md:px-6">
      <div class="flex flex-col items-center gap-3">
        <p class="text-sm text-zinc-400 text-center">
          © 2025 CommonThread. All rights reserved. Developed by
          <a href="https://t.me/Imagehostssbot" target="_blank" class="text-orange-200 hover:text-orange-100 font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-orange-300/30 rounded">
            CommonThread
          </a>.
        </p>

        <div class="inline-flex items-center gap-4">
          <a href="https://t.me/Imagehostssbot" target="_blank" aria-label="Telegram Channel" class="inline-flex h-9 w-9 items-center justify-center rounded-xl ring-1 ring-white/10 hover:ring-orange-300/30 hover:text-orange-200 transition-colors focus:outline-none focus:ring-2 focus:ring-orange-300/30 bg-white/[0.02]">
            <span class="iconify h-5 w-5" data-icon="lucide:send" data-inline="false"></span>
          </a>

          <a href="https://media-hosting.dhyeyp254.workers.dev" target="_blank" aria-label="GitHub Profile" class="inline-flex h-9 w-9 items-center justify-center rounded-xl ring-1 ring-white/10 hover:ring-orange-300/30 hover:text-orange-200 transition-colors focus:outline-none focus:ring-2 focus:ring-orange-300/30 bg-white/[0.02]">
            <span class="iconify h-5 w-5" data-icon="lucide:github" data-inline="false"></span>
          </a>
        </div>
      </div>
    </div>
  </footer>

  <script>
    document.addEventListener('DOMContentLoaded', () => {
      const reducedMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

      const menuBtn = document.getElementById('menu-toggle');
      const mobileNav = document.getElementById('mobile-nav');
      const mobileBackdrop = document.getElementById('mobile-backdrop');
      const mobilePanel = document.getElementById('mobile-panel');
      const loader = document.getElementById('page-loader');
      const nav = document.getElementById('top-nav');
      const toTop = document.getElementById('to-top');
      const scrollbar = document.getElementById('scrollbar');

      // Header scroll state + progress
      const onScroll = () => {
        const y = window.scrollY || 0;

        if (y > 10) {
          nav.classList.add('shadow-lg','shadow-black/40');
          nav.style.background = 'linear-gradient(to bottom, rgba(0,0,0,0.82), rgba(0,0,0,0.58))';
        } else {
          nav.classList.remove('shadow-lg','shadow-black/40');
          nav.style.background = 'linear-gradient(to bottom, rgba(10,10,10,0.72), rgba(10,10,10,0.55))';
        }

        const doc = document.documentElement;
        const scrollTop = doc.scrollTop || document.body.scrollTop;
        const height = (doc.scrollHeight - doc.clientHeight) || 1;
        const progress = Math.max(0, Math.min(1, scrollTop / height));
        if (scrollbar) scrollbar.style.width = (progress * 100).toFixed(2) + '%';

        if (toTop) {
          if (y > 700) toTop.classList.remove('hidden');
          else toTop.classList.add('hidden');
        }
      };
      onScroll();
      window.addEventListener('scroll', onScroll, { passive: true });

      if (toTop) {
        toTop.addEventListener('click', () => {
          window.scrollTo({ top: 0, behavior: reducedMotion ? 'auto' : 'smooth' });
        });
      }

      // Mobile menu open/close with transitions
      const setMenuIcon = (name) => {
        menuBtn.innerHTML = '<span class="iconify h-5 w-5" data-icon="lucide:' + name + '" data-inline="false"></span>';
      };

      const openMenu = () => {
        mobileNav.classList.remove('hidden');
        requestAnimationFrame(() => {
          mobileBackdrop.classList.remove('opacity-0');
          mobileBackdrop.classList.add('opacity-100');
          mobilePanel.classList.remove('opacity-0','translate-y-2');
          mobilePanel.classList.add('opacity-100','translate-y-0');
        });
        setMenuIcon('x');
        menuBtn.setAttribute('aria-expanded', 'true');
        document.body.classList.add('overflow-hidden');
      };

      const closeMenu = () => {
        mobileBackdrop.classList.add('opacity-0');
        mobileBackdrop.classList.remove('opacity-100');
        mobilePanel.classList.add('opacity-0','translate-y-2');
        mobilePanel.classList.remove('opacity-100','translate-y-0');
        setTimeout(() => {
          mobileNav.classList.add('hidden');
        }, 250);
        setMenuIcon('menu');
        menuBtn.setAttribute('aria-expanded', 'false');
        document.body.classList.remove('overflow-hidden');
      };

      menuBtn.addEventListener('click', () => {
        const isHidden = mobileNav.classList.contains('hidden');
        isHidden ? openMenu() : closeMenu();
      });

      mobileBackdrop.addEventListener('click', closeMenu);
      document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && !mobileNav.classList.contains('hidden')) closeMenu();
      });

      document.querySelectorAll('.mobile-link').forEach(el => {
        el.addEventListener('click', () => closeMenu());
      });

      // Copy buttons (animated state)
      function bindCopyButtons() {
        document.querySelectorAll('button[data-copy]').forEach(btn => {
          btn.addEventListener('click', async () => {
            const selector = btn.getAttribute('data-copy');
            const el = document.querySelector(selector);
            if (!el) return;

            const text = (el.textContent || '').trim();

            try {
              await navigator.clipboard.writeText(text);
              const original = btn.innerHTML;
              btn.innerHTML = '<span class="iconify h-3.5 w-3.5" data-icon="lucide:check" data-inline="false"></span>Copied';
              btn.style.background = 'linear-gradient(90deg, rgba(253,186,116,1), rgba(251,146,60,1))';

              if (!reducedMotion) {
                btn.animate(
                  [{ transform: 'translateY(0)' }, { transform: 'translateY(-2px)' }, { transform: 'translateY(0)' }],
                  { duration: 260, easing: 'cubic-bezier(.2,.8,.2,1)' }
                );
              }

              setTimeout(() => {
                btn.innerHTML = original;
                btn.style.background = 'linear-gradient(90deg, rgba(251,146,60,1), rgba(253,186,116,1))';
              }, 1300);
            } catch (e) {}
          });
        });
      }
      bindCopyButtons();

      // Reveal-on-scroll (accessible)
      const revealEls = document.querySelectorAll('[data-reveal]');
      revealEls.forEach((el, idx) => {
        el.classList.add('opacity-0','translate-y-4','transition-all','duration-700');
        el.style.transitionDelay = Math.min(idx * 70, 280) + "ms";
      });

      if (reducedMotion) {
        revealEls.forEach((el) => {
          el.classList.remove('opacity-0','translate-y-4');
          el.style.transitionDelay = '0ms';
        });
      } else {
        const io = new IntersectionObserver((entries) => {
          entries.forEach(entry => {
            if (entry.isIntersecting) {
              entry.target.classList.remove('opacity-0','translate-y-4');
              io.unobserve(entry.target);
            }
          });
        }, { threshold: 0.12 });
        revealEls.forEach(el => io.observe(el));
      }

      // Collapsible sections
      const toggles = Array.from(document.querySelectorAll('.section-toggle'));
      const setExpanded = (btn, expanded) => {
        const targetSel = btn.getAttribute('data-target');
        const panel = document.querySelector(targetSel);
        const chevron = btn.querySelector('.chevron');
        if (!panel) return;

        btn.setAttribute('aria-expanded', expanded ? 'true' : 'false');

        if (expanded) {
          panel.classList.remove('hidden');
          if (chevron) chevron.classList.add('rotate-180');
          if (!reducedMotion) {
            panel.animate(
              [{ opacity: 0, transform: 'translateY(-4px)' }, { opacity: 1, transform: 'translateY(0)' }],
              { duration: 220, easing: 'cubic-bezier(.2,.8,.2,1)' }
            );
          }
        } else {
          if (!reducedMotion) {
            const a = panel.animate(
              [{ opacity: 1, transform: 'translateY(0)' }, { opacity: 0, transform: 'translateY(-4px)' }],
              { duration: 180, easing: 'cubic-bezier(.2,.8,.2,1)' }
            );
            a.onfinish = () => panel.classList.add('hidden');
          } else {
            panel.classList.add('hidden');
          }
          if (chevron) chevron.classList.remove('rotate-180');
        }
      };

      toggles.forEach(btn => {
        const targetSel = btn.getAttribute('data-target');
        const panel = document.querySelector(targetSel);
        if (!panel) return;

        // default open
        panel.classList.remove('hidden');
        btn.querySelector('.chevron')?.classList.add('rotate-180');

        btn.addEventListener('click', () => {
          const expanded = btn.getAttribute('aria-expanded') === 'true';
          setExpanded(btn, !expanded);
        });
      });

      const expandAll = document.getElementById('expand-all');
      const collapseAll = document.getElementById('collapse-all');
      if (expandAll) expandAll.addEventListener('click', () => toggles.forEach(t => setExpanded(t, true)));
      if (collapseAll) collapseAll.addEventListener('click', () => toggles.forEach(t => setExpanded(t, false)));

      // Loader fade-out on full load
      window.addEventListener('load', () => {
        if (!loader) return;
        if (reducedMotion) {
          loader.style.display = 'none';
          return;
        }
        loader.classList.add('opacity-0');
        setTimeout(() => { loader.remove(); }, 420);
      });
    });
  </script>

</body></html>
  `;
  return new Response(html, {
    headers: {
      "Content-Type": "text/html",
    },
  });
}

function authenticate(request, USERNAME, PASSWORD) {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader) return false;
  return isValidCredentials(authHeader, USERNAME, PASSWORD);
}

async function handleRootRequest(request, USERNAME, PASSWORD, enableAuth) {
  const cache = caches.default;
  const cacheKey = new Request(request.url);
  if (enableAuth) {
    if (!authenticate(request, USERNAME, PASSWORD)) {
      return new Response('Unauthorized', { status: 401, headers: { 'WWW-Authenticate': 'Basic realm="Admin"' } });
    }
  }
  const cachedResponse = await cache.match(cacheKey);
  if (cachedResponse) {
    return cachedResponse;
  }
﻿  const response = new Response(`
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>CommonThread - Media Hosting</title>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=JetBrains+Mono&display=swap" rel="stylesheet">
  <style>
    :root { --bg: #0e0e0e; --panel: #1a1a1a; --text: #eaeaea; --muted: #888; --accent: #f0a500; --border: #333; }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Inter', sans-serif; background: var(--bg); color: var(--text); min-height: 100vh; display: flex; flex-direction: column; align-items: center; padding: 2rem 1rem; }
    a { color: var(--accent); text-decoration: none; }
    a:hover { text-decoration: underline; }
    .container { width: 100%; max-width: 640px; margin-top: 2rem; }
    header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 2rem; border-bottom: 1px solid var(--border); padding-bottom: 1rem; }
    .logo { font-weight: 600; font-size: 1.25rem; display: flex; align-items: center; gap: 0.5rem; }
    .logo span { color: var(--accent); }
    .nav-links { display: flex; gap: 1rem; font-size: 0.9rem; }
    .nav-links a { color: var(--muted); }
    .nav-links a:hover { color: var(--text); }
    
    .upload-zone { border: 1px dashed var(--border); border-radius: 8px; padding: 3rem 2rem; text-align: center; background: var(--panel); cursor: pointer; transition: border-color 0.2s; position: relative; overflow: hidden; }
    .upload-zone:hover, .upload-zone.dragover { border-color: var(--accent); }
    .upload-zone input[type="file"] { position: absolute; inset: 0; opacity: 0; cursor: pointer; }
    .upload-msg { font-size: 1rem; font-weight: 500; margin-bottom: 0.5rem; }
    .upload-hint { font-size: 0.85rem; color: var(--muted); }
    
    .url-upload { margin-top: 1rem; display: flex; gap: 0.5rem; }
    .url-upload input { flex: 1; background: var(--panel); border: 1px solid var(--border); color: var(--text); padding: 0.75rem 1rem; border-radius: 6px; font-family: 'JetBrains Mono', monospace; font-size: 0.85rem; outline: none; }
    .url-upload input:focus { border-color: var(--accent); }
    .url-upload button { background: var(--text); color: var(--bg); border: none; padding: 0 1rem; border-radius: 6px; font-weight: 600; cursor: pointer; }
    .url-upload button:hover { background: #fff; }
    
    .progress-bar { height: 2px; background: var(--border); margin-top: 1rem; border-radius: 2px; overflow: hidden; display: none; }
    .progress-fill { height: 100%; width: 0%; background: var(--accent); transition: width 0.2s; }
    
    .result-panel { margin-top: 2rem; display: none; }
    .result-header { font-size: 0.9rem; font-weight: 600; margin-bottom: 0.75rem; display: flex; justify-content: space-between; }
    .format-toggles { display: flex; gap: 0.5rem; }
    .format-toggles button { background: none; border: none; color: var(--muted); font-size: 0.8rem; cursor: pointer; }
    .format-toggles button.active { color: var(--accent); font-weight: 600; }
    .result-box { display: flex; align-items: center; background: var(--panel); border: 1px solid var(--border); border-radius: 6px; overflow: hidden; }
    .result-box input { flex: 1; background: transparent; border: none; color: var(--text); padding: 0.75rem 1rem; font-family: 'JetBrains Mono', monospace; font-size: 0.85rem; outline: none; }
    .copy-btn { background: transparent; border: none; border-left: 1px solid var(--border); color: var(--text); padding: 0 1rem; cursor: pointer; display: flex; align-items: center; justify-content: center; height: 100%; }
    .copy-btn:hover { background: rgba(255,255,255,0.05); }
    
    .preview-img { max-width: 100%; max-height: 200px; border-radius: 6px; margin-top: 1rem; border: 1px solid var(--border); display: none; object-fit: contain; background: #000; }
    
    .history { margin-top: 3rem; }
    .history h3 { font-size: 0.9rem; font-weight: 600; margin-bottom: 1rem; color: var(--muted); border-bottom: 1px solid var(--border); padding-bottom: 0.5rem; }
    .history-list { list-style: none; display: grid; gap: 0.5rem; }
    .history-item { display: flex; align-items: center; justify-content: space-between; padding: 0.75rem; background: var(--panel); border-radius: 6px; border: 1px solid var(--border); font-size: 0.85rem; }
    .history-item a { font-family: 'JetBrains Mono', monospace; color: var(--text); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 80%; }
    
    .toast { position: fixed; bottom: 1.5rem; right: 1.5rem; background: var(--panel); border: 1px solid var(--border); padding: 0.75rem 1.25rem; border-radius: 6px; font-size: 0.9rem; font-weight: 500; display: none; box-shadow: 0 10px 30px rgba(0,0,0,0.5); z-index: 100; }
  </style>
</head>
<body>
  <div class="container">
    <header>
      <div class="logo">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path></svg>
        Common<span>Thread</span>
      </div>
      <div class="nav-links">
        <a href="/admin">Admin</a>
        <a href="/docs">API</a>
      </div>
    </header>

    <div class="upload-zone" id="dropzone">
      <input type="file" id="fileInput">
      <div class="upload-msg">Click or drag a file here</div>
      <div class="upload-hint">Up to 20MB. Images, videos, documents.</div>
    </div>
    
    <div class="url-upload">
      <input type="text" id="urlInput" placeholder="Or paste a URL directly... (Ctrl+K)">
      <button id="urlBtn">Fetch</button>
    </div>

    <div class="progress-bar" id="progressBar"><div class="progress-fill" id="progressFill"></div></div>

    <div class="result-panel" id="resultPanel">
      <div class="result-header">
        <span>File Ready</span>
        <div class="format-toggles" id="formatToggles">
          <button class="active" data-format="url">URL</button>
          <button data-format="md">Markdown</button>
          <button data-format="bb">BBCode</button>
          <button data-format="html">HTML</button>
        </div>
      </div>
      <div class="result-box">
        <input type="text" id="resultInput" readonly>
        <button class="copy-btn" id="copyBtn">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
        </button>
      </div>
      <img id="previewImg" class="preview-img" alt="Preview">
    </div>

    <div class="history" id="historyPanel" style="display: none;">
      <h3>Recent Uploads</h3>
      <ul class="history-list" id="historyList"></ul>
    </div>
  </div>

  <div class="toast" id="toast">Copied to clipboard</div>

  <script>
    const dz = document.getElementById('dropzone');
    const fi = document.getElementById('fileInput');
    const ui = document.getElementById('urlInput');
    const ub = document.getElementById('urlBtn');
    const pb = document.getElementById('progressBar');
    const pf = document.getElementById('progressFill');
    const rp = document.getElementById('resultPanel');
    const ri = document.getElementById('resultInput');
    const cb = document.getElementById('copyBtn');
    const toast = document.getElementById('toast');
    const pi = document.getElementById('previewImg');
    const hl = document.getElementById('historyList');
    const hp = document.getElementById('historyPanel');
    const toggles = document.querySelectorAll('.format-toggles button');
    
    let currentUrl = '';
    
    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
      if (e.ctrlKey && e.key === 'k') { e.preventDefault(); ui.focus(); }
    });
    
    document.addEventListener('paste', (e) => {
      if (document.activeElement === ui || document.activeElement === ri) return;
      if (e.clipboardData.files.length) { handleFile(e.clipboardData.files[0]); }
    });

    // Drag & Drop
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(ev => dz.addEventListener(ev, e => e.preventDefault()));
    ['dragenter', 'dragover'].forEach(ev => dz.addEventListener(ev, () => dz.classList.add('dragover')));
    ['dragleave', 'drop'].forEach(ev => dz.addEventListener(ev, () => dz.classList.remove('dragover')));
    dz.addEventListener('drop', e => { if (e.dataTransfer.files.length) handleFile(e.dataTransfer.files[0]); });
    fi.addEventListener('change', () => { if (fi.files.length) handleFile(fi.files[0]); });
    
    ub.addEventListener('click', () => {
      if (ui.value) uploadUrl(ui.value);
    });
    ui.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && ui.value) uploadUrl(ui.value);
    });

    function showToast(msg) {
      toast.textContent = msg;
      toast.style.display = 'block';
      setTimeout(() => toast.style.display = 'none', 3000);
    }
    
    function setProgress(percent) {
      if (percent === 0) { pb.style.display = 'block'; pf.style.width = '0%'; }
      else if (percent >= 100) { pf.style.width = '100%'; setTimeout(() => pb.style.display = 'none', 500); }
      else { pf.style.width = percent + '%'; }
    }

    function showResult(url, isImage) {
      currentUrl = url;
      rp.style.display = 'block';
      updateFormat();
      
      if (isImage) { pi.src = url; pi.style.display = 'block'; } 
      else { pi.style.display = 'none'; }
      
      saveHistory(url);
    }

    toggles.forEach(btn => {
      btn.addEventListener('click', (e) => {
        toggles.forEach(b => b.classList.remove('active'));
        e.target.classList.add('active');
        updateFormat();
      });
    });

    function updateFormat() {
      const format = document.querySelector('.format-toggles .active').dataset.format;
      let out = currentUrl;
      if (format === 'md') out = '![Image](' + currentUrl + ')';
      if (format === 'bb') out = '[img]' + currentUrl + '[/img]';
      if (format === 'html') out = '<img src="' + currentUrl + '" alt="Image" />';
      ri.value = out;
    }

    cb.addEventListener('click', () => {
      ri.select();
      document.execCommand('copy');
      showToast('Copied to clipboard');
    });

    async function handleFile(file) {
      if (file.size > 20 * 1024 * 1024) return showToast('File exceeds 20MB limit');
      setProgress(0);
      const fd = new FormData();
      fd.append('file', file);
      
      // Fake progress
      let p = 10;
      const int = setInterval(() => { p += Math.random()*20; if(p>85)p=85; setProgress(p); }, 200);

      try {
        const res = await fetch('/upload', { method: 'POST', body: fd });
        clearInterval(int);
        setProgress(100);
        if (!res.ok) throw new Error(await res.text());
        const data = await res.json();
        showResult(data.url, file.type.startsWith('image/'));
      } catch (err) {
        clearInterval(int);
        setProgress(100);
        showToast('Upload failed: ' + err.message);
      }
    }

    async function uploadUrl(url) {
      setProgress(0);
      let p = 10;
      const int = setInterval(() => { p += Math.random()*20; if(p>85)p=85; setProgress(p); }, 200);
      try {
        const res = await fetch('/hosturl?url=' + encodeURIComponent(url));
        clearInterval(int);
        setProgress(100);
        if (!res.ok) throw new Error(await res.text());
        const data = await res.json();
        showResult(data.url, true);
        ui.value = '';
      } catch (err) {
        clearInterval(int);
        setProgress(100);
        showToast('Fetch failed: ' + err.message);
      }
    }
    
    function saveHistory(url) {
      let h = JSON.parse(localStorage.getItem('ct_history') || '[]');
      h = [url, ...h.filter(x => x !== url)].slice(0, 5);
      localStorage.setItem('ct_history', JSON.stringify(h));
      renderHistory();
    }
    
    function renderHistory() {
      const h = JSON.parse(localStorage.getItem('ct_history') || '[]');
      if (h.length === 0) { hp.style.display = 'none'; return; }
      hp.style.display = 'block';
      hl.innerHTML = h.map(url => '        <li class="history-item">          <a href="' + url + '" target="_blank">' + url + '</a>          <button style="background:none;border:none;color:var(--muted);cursor:pointer;" onclick="navigator.clipboard.writeText(&quot;' + url + '&quot;);showToast(&quot;Copied!&quot;)">            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>          </button>        </li>').join('');
    }
    renderHistory();
  </script>
</body>
</html>
`, { headers: { 'Content-Type': 'text/html;charset=UTF-8' } });

  return response;
}

async function handleAdminRequest(DATABASE, request, USERNAME, PASSWORD) {
  if (!authenticate(request, USERNAME, PASSWORD)) {
    return new Response('Unauthorized', { status: 401, headers: { 'WWW-Authenticate': 'Basic realm="Admin"' } });
  }
  return await generateAdminPage(DATABASE);
}

// New API endpoint for paginated media data with authentication
async function handleAdminMediaApiRequest(DATABASE, request, USERNAME, PASSWORD) {
  // Authentication check - same as admin panel
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

    // Validate parameters
    if (page < 1 || limit < 1 || limit > 500) {
      return new Response(JSON.stringify({ error: 'Invalid parameters' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Get total count and paginated data
    const total = await getTotalMediaCount(DATABASE);
    const mediaData = await fetchMediaData(DATABASE, page, limit);
    const hasMore = (page * limit) < total;

    const response = {
      media: mediaData,
      total: total,
      page: page,
      limit: limit,
      has_more: hasMore
    };

    return new Response(JSON.stringify(response), {
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

// Get total count of media records
async function getTotalMediaCount(DATABASE) {
  const result = await DATABASE.prepare('SELECT COUNT(*) as count FROM media').first();
  return result ? result.count : 0;
}

function isValidCredentials(authHeader, USERNAME, PASSWORD) {
  const base64Credentials = authHeader.split(' ')[1];
  const credentials = atob(base64Credentials).split(':');
  const username = credentials[0];
  const password = credentials[1];
  return username === USERNAME && password === PASSWORD;
}

async function generateAdminPage(DATABASE) {
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
        <span>Showing <span id="loaded-count">${mediaData.length}</span> of <span id="total-count">${totalCount}</span> files</span>
        <span style="margin-left: 15px;">Selected: <span id="selected-count">0</span> files</span>
      </div>
      <div class="header-right hidden">
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
    <div class="gallery">
      ${mediaHtml}
    </div>
    <div id="loading-indicator" class="loading-indicator hidden">
      <p>Loading more files...</p>
    </div>
    <div id="end-message" class="end-message hidden">
      <p>✓ All files loaded</p>
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

async function handleUploadRequest(request, DATABASE, enableAuth, USERNAME, PASSWORD, domain, TG_BOT_TOKEN, TG_CHAT_ID, maxSize) {
  try {
    const formData = await request.formData();
    const file = formData.get('file');
    if (!file) throw new Error('Missing files');
    if (file.size > maxSize) {
      return new Response(JSON.stringify({ error: `File size exceeds ${maxSize / (1024 * 1024)}MB Limit` }), { status: 413, headers: { 'Content-Type': 'application/json', 'X-Powered-By': 'Cloudflare Workers + CommonThread API', 'X-API-Version': '6.0', 'X-Creator': 'https://t.me/Imagehostssbot' } });
    }
    if (enableAuth && !authenticate(request, USERNAME, PASSWORD)) {
      return new Response('Unauthorized', { status: 401, headers: { 'WWW-Authenticate': 'Basic realm="Admin"', 'X-Powered-By': 'Cloudflare Workers + CommonThread API', 'X-API-Version': '6.0', 'X-Creator': 'https://t.me/Imagehostssbot' } });
    }
    const uploadFormData = new FormData();
    uploadFormData.append("chat_id", TG_CHAT_ID);
    let fileId;
    let tgFileName = file.name;
    if (file.type.startsWith('image/gif')) {
      const newFileName = file.name.replace(/\.gif$/, '.jpeg');
      const newFile = new File([file], newFileName, { type: 'image/jpeg' });
      uploadFormData.append("document", newFile);
      tgFileName = newFileName;
    } else {
      uploadFormData.append("document", file);
    }
    const telegramResponse = await fetch(`https://api.telegram.org/bot${TG_BOT_TOKEN}/sendDocument`, { method: 'POST', body: uploadFormData });
    if (!telegramResponse.ok) {
      const errorData = await telegramResponse.json();
      throw new Error(errorData.description || 'Upload to Telegram failed');
    }
    const responseData = await telegramResponse.json();
    if (responseData.result.video) fileId = responseData.result.video.file_id;
    else if (responseData.result.document) fileId = responseData.result.document.file_id;
    else if (responseData.result.sticker) fileId = responseData.result.sticker.file_id;
    else if (responseData.result.audio) fileId = responseData.result.audio.file_id; // Added audio support
    else throw new Error('There is no file in the returned data ID');
    // Get filename from Telegram API response if available
    let originalFileName = tgFileName;
    if (responseData.result.document && responseData.result.document.file_name) {
      originalFileName = responseData.result.document.file_name;
    } else if (responseData.result.video && responseData.result.video.file_name) {
      originalFileName = responseData.result.video.file_name;
    } else if (responseData.result.audio && responseData.result.audio.file_name) {
      originalFileName = responseData.result.audio.file_name;
    }
    const fileExtension = file.name.split('.').pop();
    const timestamp = Date.now();
    const imageURL = `https://${domain}/${timestamp}.${fileExtension}`;
    await DATABASE.prepare('INSERT INTO media (url, fileId, filename) VALUES (?, ?, ?) ON CONFLICT(url) DO NOTHING').bind(imageURL, fileId, originalFileName).run();
    const json = {
      data: imageURL, // backward compatibility
      url: imageURL,  // new field
      filename: originalFileName,
      size: file.size,
      uploaded_on: new Date(timestamp).toISOString(),
      media_type: file.type,
      creator: 'https://t.me/Imagehostssbot'
    };
    return new Response(JSON.stringify(json), { status: 200, headers: { 'Content-Type': 'application/json', 'X-Powered-By': 'Cloudflare Workers + CommonThread API', 'X-API-Version': '6.0', 'X-Creator': 'https://t.me/Imagehostssbot' } });
  } catch (error) {
    console.error('Internal Server Error:', error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { 'Content-Type': 'application/json', 'X-Powered-By': 'Cloudflare Workers + CommonThread API', 'X-API-Version': '6.0', 'X-Creator': 'https://t.me/Imagehostssbot' } });
  }
}

async function handleApiRegisterRequest(request, DATABASE, domain, USERNAME, PASSWORD) {
  try {
    if (!authenticate(request, USERNAME, PASSWORD)) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { 'Content-Type': 'application/json' } });
    }
    const data = await request.json();
    const { fileId, originalFileName, fileExtension, fileSize, mediaType } = data;
    if (!fileId) return new Response(JSON.stringify({ error: 'Missing fileId' }), { status: 400 });
    
    const timestamp = Date.now();
    const ext = fileExtension || 'bin';
    const imageURL = `https://${domain}/${timestamp}.${ext}`;
    
    await DATABASE.prepare('INSERT INTO media (url, fileId, filename) VALUES (?, ?, ?) ON CONFLICT(url) DO NOTHING')
      .bind(imageURL, fileId, originalFileName || 'telegram_upload')
      .run();
      
    const json = {
      url: imageURL,
      filename: originalFileName,
      size: fileSize || 0,
      uploaded_on: new Date(timestamp).toISOString(),
      media_type: mediaType || 'unknown',
      creator: 'https://t.me/Imagehostssbot'
    };
    return new Response(JSON.stringify(json), { status: 200, headers: { 'Content-Type': 'application/json' } });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
}

async function handleUrlUploadRequest(request, DATABASE, enableAuth, USERNAME, PASSWORD, domain, TG_BOT_TOKEN, TG_CHAT_ID, maxSize) {
  try {
    if (enableAuth && !authenticate(request, USERNAME, PASSWORD)) {
      return new Response('Unauthorized', { status: 401, headers: { 'WWW-Authenticate': 'Basic realm="Admin"', 'X-Powered-By': 'Cloudflare Workers + CommonThread API', 'X-API-Version': '6.0', 'X-Creator': 'https://t.me/Imagehostssbot' } });
    }
    const url = new URL(request.url);
    const fileUrl = url.searchParams.get('url');
    if (!fileUrl) {
      return new Response(JSON.stringify({ error: 'Missing url parameter' }), { status: 400, headers: { 'Content-Type': 'application/json', 'X-Powered-By': 'Cloudflare Workers + CommonThread API', 'X-API-Version': '6.0', 'X-Creator': 'https://t.me/Imagehostssbot' } });
    }
    const fileResponse = await fetch(fileUrl);
    if (!fileResponse.ok) {
      return new Response(JSON.stringify({ error: 'Failed to download file from URL' }), { status: 400, headers: { 'Content-Type': 'application/json', 'X-Powered-By': 'Cloudflare Workers + CommonThread API', 'X-API-Version': '6.0', 'X-Creator': 'https://t.me/Imagehostssbot' } });
    }
    const contentType = fileResponse.headers.get('content-type') || 'application/octet-stream';
    const fileName = new URL(fileUrl).pathname.split('/').pop() || 'downloaded-file';
    const fileBuffer = await fileResponse.arrayBuffer();
    if (fileBuffer.byteLength > maxSize) {
      return new Response(JSON.stringify({ error: `File size exceeds ${maxSize / (1024 * 1024)}MB Limit` }), { status: 413, headers: { 'Content-Type': 'application/json', 'X-Powered-By': 'Cloudflare Workers + CommonThread API', 'X-API-Version': '6.0', 'X-Creator': 'https://t.me/Imagehostssbot' } });
    }
    const file = new File([fileBuffer], fileName, { type: contentType });
    const uploadFormData = new FormData();
    uploadFormData.append("chat_id", TG_CHAT_ID);
    let fileId;
    let tgFileName = fileName;
    if (contentType === 'image/gif') {
      const newFileName = fileName.replace(/\.gif$/, '.jpeg');
      const newFile = new File([fileBuffer], newFileName, { type: 'image/jpeg' });
      uploadFormData.append("document", newFile);
      tgFileName = newFileName;
    } else {
      uploadFormData.append("document", file);
    }
    // Upload to Telegram
    const telegramResponse = await fetch(`https://api.telegram.org/bot${TG_BOT_TOKEN}/sendDocument`, { method: 'POST', body: uploadFormData });
    if (!telegramResponse.ok) {
      const errorData = await telegramResponse.json();
      throw new Error(errorData.description || 'Upload to Telegram failed');
    }
    const responseData = await telegramResponse.json();
    if (responseData.result.video) fileId = responseData.result.video.file_id;
    else if (responseData.result.document) fileId = responseData.result.document.file_id;
    else if (responseData.result.sticker) fileId = responseData.result.sticker.file_id;
    else if (responseData.result.audio) fileId = responseData.result.audio.file_id;
    else throw new Error('There is no file in the returned data ID');
    // Get filename from Telegram API response if available
    let originalFileName = tgFileName;
    if (responseData.result.document && responseData.result.document.file_name) {
      originalFileName = responseData.result.document.file_name;
    } else if (responseData.result.video && responseData.result.video.file_name) {
      originalFileName = responseData.result.video.file_name;
    } else if (responseData.result.audio && responseData.result.audio.file_name) {
      originalFileName = responseData.result.audio.file_name;
    }
    const fileExtension = fileName.split('.').pop();
    const timestamp = Date.now();
    const imageURL = `https://${domain}/${timestamp}.${fileExtension}`;
    await DATABASE.prepare('INSERT INTO media (url, fileId, filename) VALUES (?, ?, ?) ON CONFLICT(url) DO NOTHING').bind(imageURL, fileId, originalFileName).run();
    const json = {
      data: imageURL, // backward compatibility
      url: imageURL,  // new field
      filename: originalFileName,
      size: fileBuffer.byteLength,
      uploaded_on: new Date(timestamp).toISOString(),
      media_type: contentType,
      creator: 'https://t.me/Imagehostssbot'
    };
    return new Response(JSON.stringify(json), { status: 200, headers: { 'Content-Type': 'application/json', 'X-Powered-By': 'Cloudflare Workers + CommonThread API', 'X-API-Version': '6.0', 'X-Creator': 'https://t.me/Imagehostssbot' } });
  } catch (error) {
    console.error('Internal Server Error:', error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { 'Content-Type': 'application/json', 'X-Powered-By': 'Cloudflare Workers + CommonThread API', 'X-API-Version': '6.0', 'X-Creator': 'https://t.me/Imagehostssbot' } });
  }
}

async function handleImageRequest(request, DATABASE, TG_BOT_TOKEN) {
  const requestedUrl = request.url;
  const cache = caches.default;
  const cacheKey = new Request(requestedUrl);
  const cachedResponse = await cache.match(cacheKey);
  if (cachedResponse) return cachedResponse;
  const result = await DATABASE.prepare('SELECT fileId, filename FROM media WHERE url = ?').bind(requestedUrl).first();
  if (!result) {
    const notFoundHtml = `
    <html lang="en"><head>
    <meta charset="utf-8">
    <meta http-equiv="Content-Security-Policy" content="default-src 'self' https: data: blob:; img-src * data: blob:; script-src 'self' https: 'unsafe-inline'; style-src 'self' https: 'unsafe-inline'; font-src 'self' https: data:; connect-src *; base-uri 'self'; object-src 'none'; form-action 'self'">
    <meta name="robots" content="noindex">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>404 - Page Not Found | CommonThread</title>
    <link rel="icon" href="https://api.iconify.design/lucide:link.svg">
  
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600&amp;display=swap" rel="preload" as="style" onload="this.rel='stylesheet'">
    <noscript><link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600&amp;display=swap" rel="stylesheet"></noscript>
  
    <script src="https://cdn.tailwindcss.com"></script>
    <script src="https://code.iconify.design/3/3.1.1/iconify.min.js"></script>
  </head>
  
  <body class="min-h-screen bg-black text-zinc-200 antialiased selection:bg-orange-300/10 selection:text-orange-200" style="
      font-family: Inter, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, 'Apple Color Emoji', 'Segoe UI Emoji';
      background-attachment: fixed;
      background-image:
        radial-gradient(1000px 600px at 12% 10%, rgba(251,146,60,0.14), transparent 60%),
        radial-gradient(900px 600px at 88% 78%, rgba(253,186,116,0.10), transparent 62%),
        radial-gradient(750px 500px at 50% 105%, rgba(244,63,94,0.10), transparent 65%),
        linear-gradient(to bottom, rgba(0,0,0,1), rgba(0,0,0,1));
    ">
    <!-- Ambient grid -->
    <div class="fixed inset-0 -z-10">
      <div class="absolute inset-0 opacity-[0.18]" style="background-image: radial-gradient(rgba(255,255,255,0.10) 1px, transparent 1px); background-size: 1.25rem 1.25rem;"></div>
      <div class="absolute inset-0 opacity-60" style="mask-image: radial-gradient(60% 55% at 50% 35%, black 60%, transparent 100%); background: linear-gradient(to bottom, rgba(0,0,0,0), rgba(0,0,0,1));"></div>
    </div>
  
    <!-- Top Nav -->
    <header class="fixed inset-x-0 top-0 z-50">
      <nav id="top-nav" class="mx-auto flex items-center justify-between px-4 md:px-6 py-3 backdrop-blur-xl bg-black/60 border-b border-white/10 transition-all duration-300">
        <a href="/" class="group inline-flex items-center gap-3">
          <img src="https://api.iconify.design/lucide:link.svg" alt="CommonThread" class="h-9 w-9 rounded-full ring-1 ring-white/10">
          <span class="text-lg font-semibold tracking-tight text-transparent bg-clip-text" style="background-image: linear-gradient(90deg, rgba(253,186,116,1), rgba(251,146,60,1), rgba(244,63,94,0.95));">CommonThread</span>
        </a>
  
        <div class="flex items-center gap-2">
          <a href="/docs" class="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-zinc-200 hover:text-orange-200 hover:bg-white/[0.05] ring-1 ring-white/10 hover:ring-orange-300/25 transition-colors focus:outline-none focus:ring-2 focus:ring-orange-300/30">
            <span class="iconify h-4 w-4" data-icon="lucide:book-open-text"></span>
            <span>API Docs</span>
          </a>
        </div>
      </nav>
    </header>
  
    <main class="relative">
      <!-- Decorative glows -->
      <div class="pointer-events-none absolute inset-0 overflow-hidden">
        <div class="absolute -top-36 -left-28 h-72 w-72 rounded-full blur-3xl opacity-70" style="background: radial-gradient(circle at 35% 35%, rgba(251,146,60,0.35), transparent 60%);">
        </div>
        <div class="absolute -bottom-40 -right-32 h-80 w-80 rounded-full blur-3xl opacity-70" style="background: radial-gradient(circle at 35% 35%, rgba(244,63,94,0.26), transparent 60%);">
        </div>
      </div>
  
      <section class="relative mx-auto max-w-3xl px-4 md:px-6 pt-28 pb-10">
        <div class="rounded-2xl border border-white/10 bg-white/[0.03] backdrop-blur-xl shadow-2xl shadow-black/40 ring-1 ring-white/10 overflow-hidden">
          <div class="relative p-6 sm:p-10">
            <div class="absolute inset-0 opacity-70 pointer-events-none" style="background:
                radial-gradient(900px 400px at 10% 0%, rgba(251,146,60,0.10), transparent 55%),
                radial-gradient(900px 400px at 95% 30%, rgba(253,186,116,0.07), transparent 55%);
              ">
            </div>
  
            <!-- 404 badge -->
            <div class="relative flex items-center justify-center">
              <div class="absolute -inset-x-10 -top-6 -bottom-6">
                <div class="h-full w-full rounded-3xl blur-2xl" style="background: linear-gradient(135deg, rgba(251,146,60,0.12), rgba(244,63,94,0.10));">
                </div>
              </div>
  
              <div class="inline-flex items-center gap-3 rounded-full border border-white/10 bg-black/50 px-4 py-2 text-zinc-300 ring-1 ring-white/10">
                <span class="inline-flex h-2.5 w-2.5 rounded-full ring-4 ring-orange-300/10" style="background: linear-gradient(90deg, rgba(253,186,116,1), rgba(251,146,60,1));">
                </span>
                <span class="text-xs font-medium">Error</span>
                <span class="h-4 w-px bg-white/10"></span>
                <span class="text-xs font-semibold tracking-tight text-zinc-100">404</span>
              </div>
            </div>
  
            <div class="mt-6 text-center relative">
              <p class="text-6xl sm:text-7xl font-semibold tracking-tight text-transparent bg-clip-text leading-none" style="background-image: linear-gradient(90deg, rgba(253,186,116,1), rgba(251,146,60,1), rgba(244,63,94,0.95));">
                404
              </p>
  
              <h1 class="mt-4 text-2xl sm:text-3xl font-semibold tracking-tight text-zinc-50">
                Page not found
              </h1>
  
              <p class="mt-3 text-sm sm:text-base text-zinc-400">
                This page doesn’t exist—or it’s been moved. Check the address and try again.
              </p>
            </div>
  
            <!-- Actions -->
            <div class="mt-8 flex flex-wrap items-center justify-center gap-3 relative">
              <a href="/" class="group relative inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-black font-semibold tracking-tight ring-1 ring-white/10 shadow-lg shadow-orange-500/10 hover:shadow-orange-500/20 transition-all focus:outline-none focus:ring-2 focus:ring-orange-300/30" style="background-image: linear-gradient(90deg, rgba(253,186,116,1), rgba(251,146,60,1));">
                <span class="absolute -inset-px rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300" style="background: radial-gradient(180px 70px at 35% 15%, rgba(255,255,255,0.35), transparent 70%);">
                </span>
                <span class="iconify relative h-4 w-4" data-icon="lucide:home"></span>
                <span class="relative">Return home</span>
              </a>
  
              <a href="/docs" class="inline-flex items-center gap-2 rounded-lg bg-white/[0.04] px-4 py-2.5 text-zinc-100 font-medium ring-1 ring-white/10 hover:bg-white/[0.07] hover:ring-orange-300/25 transition-all focus:outline-none focus:ring-2 focus:ring-orange-300/30">
                <span class="iconify h-4 w-4 text-orange-200" data-icon="lucide:book"></span>
                <span>View documentation</span>
              </a>
  
              <button id="copy-url" class="inline-flex items-center gap-2 rounded-lg bg-white/[0.04] px-4 py-2.5 text-zinc-100 font-medium ring-1 ring-white/10 hover:bg-white/[0.07] hover:ring-orange-300/25 transition-all focus:outline-none focus:ring-2 focus:ring-orange-300/30">
                <span class="iconify h-4 w-4 text-orange-200" data-icon="lucide:copy"></span>
                <span>Copy requested URL</span>
              </button>
            </div>
  
            <!-- Suggestions -->
            <div class="mt-9 relative">
              <h2 class="text-base sm:text-lg font-semibold tracking-tight text-zinc-50 text-center">What can you do?</h2>
              <ul class="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
                <li class="group rounded-lg border border-white/10 bg-white/[0.04] p-4 hover:bg-white/[0.07] hover:border-orange-300/25 transition-colors">
                  <div class="flex items-start gap-3">
                    <div class="mt-0.5 inline-flex h-8 w-8 items-center justify-center rounded-md bg-orange-300/10 text-orange-200 ring-1 ring-orange-300/20">
                      <span class="iconify h-4 w-4" data-icon="lucide:search"></span>
                    </div>
                    <div class="flex-1">
                      <p class="text-sm font-medium text-zinc-50">Check the URL</p>
                      <p class="text-sm text-zinc-400">Make sure there are no typos in the address.</p>
                    </div>
                  </div>
                </li>
  
                <li class="group rounded-lg border border-white/10 bg-white/[0.04] p-4 hover:bg-white/[0.07] hover:border-orange-300/25 transition-colors">
                  <div class="flex items-start gap-3">
                    <div class="mt-0.5 inline-flex h-8 w-8 items-center justify-center rounded-md bg-orange-300/10 text-orange-200 ring-1 ring-orange-300/20">
                      <span class="iconify h-4 w-4" data-icon="lucide:arrow-left"></span>
                    </div>
                    <div class="flex-1">
                      <a href="javascript:history.back()" class="text-sm font-medium text-orange-200 hover:text-orange-100 transition-colors underline underline-offset-4 decoration-white/15">Go back</a>
                      <p class="text-sm text-zinc-400">Return to the previous page.</p>
                    </div>
                  </div>
                </li>
  
                <li class="group rounded-lg border border-white/10 bg-white/[0.04] p-4 hover:bg-white/[0.07] hover:border-orange-300/25 transition-colors sm:col-span-2">
                  <div class="flex items-start gap-3">
                    <div class="mt-0.5 inline-flex h-8 w-8 items-center justify-center rounded-md bg-orange-300/10 text-orange-200 ring-1 ring-orange-300/20">
                      <span class="iconify h-4 w-4" data-icon="lucide:help-circle"></span>
                    </div>
                    <div class="flex-1">
                      <p class="text-sm font-medium text-zinc-50">Need help?</p>
                      <p class="text-sm text-zinc-400">
                        Visit our
                        <a href="https://t.me/Imagehostssbot" class="text-orange-200 hover:text-orange-100 underline underline-offset-4 decoration-white/15">TG Channel</a>
                        for assistance.
                      </p>
                    </div>
                  </div>
                </li>
              </ul>
            </div>
  
            <!-- Technical details -->
            <div class="mt-8 border-t border-white/10 pt-6 relative">
              <div class="flex items-center justify-between gap-3">
                <h3 class="text-sm font-semibold tracking-tight text-zinc-100/90">Technical details</h3>
                <button id="refresh-details" class="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium text-zinc-200 bg-white/[0.03] ring-1 ring-white/10 hover:bg-white/[0.06] hover:ring-orange-300/25 transition-colors focus:outline-none focus:ring-2 focus:ring-orange-300/30">
                  <span class="iconify h-4 w-4 text-orange-200" data-icon="lucide:refresh-ccw"></span>
                  Refresh
                </button>
              </div>
  
              <div class="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div class="flex items-start justify-between gap-4 rounded-lg bg-white/[0.04] p-3 ring-1 ring-white/10">
                  <div class="inline-flex items-center gap-2 text-zinc-300">
                    <span class="iconify h-4 w-4" data-icon="lucide:link"></span>
                    <span class="text-xs font-medium">Requested URL</span>
                  </div>
                  <div id="page-url" class="max-w-[65%] text-right text-xs text-zinc-400 break-words"></div>
                </div>
  
                <div class="flex items-start justify-between gap-4 rounded-lg bg-white/[0.04] p-3 ring-1 ring-white/10">
                  <div class="inline-flex items-center gap-2 text-zinc-300">
                    <span class="iconify h-4 w-4" data-icon="lucide:clock"></span>
                    <span class="text-xs font-medium">Timestamp</span>
                  </div>
                  <div id="date-time" class="max-w-[65%] text-right text-xs text-zinc-400 break-words"></div>
                </div>
  
                <div class="flex items-start justify-between gap-4 rounded-lg bg-white/[0.04] p-3 ring-1 ring-white/10">
                  <div class="inline-flex items-center gap-2 text-zinc-300">
                    <span class="iconify h-4 w-4" data-icon="lucide:network"></span>
                    <span class="text-xs font-medium">Your IP</span>
                  </div>
                  <div id="user-ip" class="max-w-[65%] text-right text-xs text-zinc-400 break-words">Loading…</div>
                </div>
  
                <div class="flex items-start justify-between gap-4 rounded-lg bg-white/[0.04] p-3 ring-1 ring-white/10">
                  <div class="inline-flex items-center gap-2 text-zinc-300">
                    <span class="iconify h-4 w-4" data-icon="lucide:map-pin"></span>
                    <span class="text-xs font-medium">Location</span>
                  </div>
                  <div id="user-location" class="max-w-[65%] text-right text-xs text-zinc-400 break-words">Detecting…</div>
                </div>
              </div>
            </div>
  
          </div>
        </div>
      </section>
    </main>
  
    <footer class="fixed inset-x-0 bottom-0 z-40">
      <div class="mx-auto w-full px-4 md:px-6 py-3 backdrop-blur-xl bg-black/60 border-t border-white/10">
        <p class="text-center text-xs text-zinc-400">
          © 2025 <a href="/" class="text-orange-200 hover:text-orange-100 transition-colors font-medium">CommonThread</a>
        </p>
      </div>
    </footer>
  
    <!-- Toast -->
    <div id="toast" class="fixed bottom-16 left-1/2 -translate-x-1/2 z-[70] pointer-events-none hidden">
      <div class="pointer-events-auto inline-flex items-center gap-2 rounded-full bg-white/[0.06] backdrop-blur-xl px-4 py-2 ring-1 ring-white/10 shadow-2xl shadow-black/40">
        <span id="toast-icon" class="iconify h-4 w-4 text-orange-200" data-icon="lucide:check"></span>
        <span id="toast-text" class="text-sm font-medium text-zinc-200">Copied</span>
      </div>
    </div>
  
    <script>
      document.addEventListener('DOMContentLoaded', function () {
        // Ensure Lucide stroke width = 1.5 for Iconify-injected SVGs
        const setLucideStroke = () => {
          document.querySelectorAll('svg').forEach(svg => {
            try { svg.setAttribute('stroke-width', '1.5'); } catch (e) {}
          });
        };
        setLucideStroke();
        setTimeout(setLucideStroke, 50);
  
        const nav = document.getElementById('top-nav');
        const onScroll = () => {
          const y = window.scrollY || 0;
          if (y > 8) {
            nav.classList.add('shadow-lg','shadow-black/30');
            nav.classList.remove('bg-black/60');
            nav.classList.add('bg-black/70');
          } else {
            nav.classList.remove('shadow-lg','shadow-black/30');
            nav.classList.add('bg-black/60');
            nav.classList.remove('bg-black/70');
          }
        };
        onScroll();
        window.addEventListener('scroll', onScroll, { passive: true });
  
        const urlEl = document.getElementById('page-url');
        const timeEl = document.getElementById('date-time');
        const ipEl = document.getElementById('user-ip');
        const locEl = document.getElementById('user-location');
  
        const toast = document.getElementById('toast');
        const toastText = document.getElementById('toast-text');
        const toastIcon = document.getElementById('toast-icon');
        let toastTimer = null;
  
        const showToast = (text, icon) => {
          if (!toast) return;
          toastText.textContent = text;
          toastIcon.setAttribute('data-icon', icon || 'lucide:check');
          toast.classList.remove('hidden');
          toast.classList.add('opacity-0');
          requestAnimationFrame(() => {
            toast.classList.remove('opacity-0');
            toast.classList.add('transition-opacity','duration-200','opacity-100');
          });
          clearTimeout(toastTimer);
          toastTimer = setTimeout(() => {
            toast.classList.add('opacity-0');
            setTimeout(() => toast.classList.add('hidden'), 200);
          }, 1200);
          setLucideStroke();
        };
  
        const setUrl = () => {
          try {
            const url = window.location.pathname + window.location.search + window.location.hash;
            urlEl.textContent = url || '/';
          } catch {
            urlEl.textContent = '/';
          }
        };
  
        const setTime = () => {
          try {
            const now = new Date();
            timeEl.textContent = now.toLocaleString(undefined, {
              year: 'numeric',
              month: 'short',
              day: '2-digit',
              hour: '2-digit',
              minute: '2-digit',
              second: '2-digit',
              timeZoneName: 'short'
            });
          } catch {
            timeEl.textContent = new Date().toISOString();
          }
        };
  
        const loadIP = () => {
          ipEl.textContent = 'Loading…';
          locEl.textContent = 'Detecting…';
  
          fetch('https://ipapi.co/json/')
            .then(r => r.ok ? r.json() : Promise.reject(new Error('Network error')))
            .then(data => {
              ipEl.textContent = data?.ip || 'Unknown';
              const parts = [];
              if (data?.city) parts.push(data.city);
              if (data?.region) parts.push(data.region);
              if (data?.country_name) parts.push(data.country_name);
              let loc = parts.join(', ') || 'Unknown';
              locEl.textContent = loc;
            })
            .catch(() => {
              ipEl.textContent = 'Unknown';
              locEl.textContent = 'Unknown';
            });
        };
  
        setUrl();
        setTime();
        loadIP();
  
        const copyBtn = document.getElementById('copy-url');
        if (copyBtn) {
          copyBtn.addEventListener('click', async () => {
            const text = (urlEl?.textContent || '').trim() || '/';
            try {
              await navigator.clipboard.writeText(text);
              showToast('Copied requested URL', 'lucide:check');
            } catch (e) {
              showToast('Copy failed', 'lucide:alert-triangle');
            }
          });
        }
  
        const refreshBtn = document.getElementById('refresh-details');
        if (refreshBtn) {
          refreshBtn.addEventListener('click', () => {
            setTime();
            loadIP();
            showToast('Details refreshed', 'lucide:refresh-ccw');
          });
        }
      });
    </script>
  
  </body></html>
    `;

    const notFoundResponse = new Response(notFoundHtml, {
      status: 404,
      headers: { 'Content-Type': 'text/html' }
    });

    await cache.put(cacheKey, notFoundResponse.clone());
    return notFoundResponse;
  }
  const fileId = result.fileId;
  let filePath;
  let attempts = 0;
  const maxAttempts = 3;
  while (attempts < maxAttempts) {
    const getFilePath = await fetch(`https://api.telegram.org/bot${TG_BOT_TOKEN}/getFile?file_id=${fileId}`);
    if (!getFilePath.ok) {
      return new Response('getFile request failed', { status: 500 });
    }
    const fileData = await getFilePath.json();
    if (fileData.ok && fileData.result.file_path) {
      filePath = fileData.result.file_path;
      break;
    }
    attempts++;
  }
  if (!filePath) {
    const notFoundResponse = new Response('FilePath not found', { status: 404 });
    await cache.put(cacheKey, notFoundResponse.clone());
    return notFoundResponse;
  }
  const getFileResponse = `https://api.telegram.org/file/bot${TG_BOT_TOKEN}/${filePath}`;
  const response = await fetch(getFileResponse);
  if (!response.ok) {
    return new Response('Failed to obtain file content', { status: 500 });
  }
  const fileExtension = requestedUrl.split('.').pop().toLowerCase();
  let contentType = 'text/plain';
  if (fileExtension === 'jpg' || fileExtension === 'jpeg') contentType = 'image/jpeg';
  if (fileExtension === 'png') contentType = 'image/png';
  if (fileExtension === 'gif') contentType = 'image/gif';
  if (fileExtension === 'webp') contentType = 'image/webp';
  if (fileExtension === 'mp4') contentType = 'video/mp4';
  if (fileExtension === 'pdf') contentType = 'application/pdf';
  if (fileExtension === 'txt') contentType = 'text/plain';
  if (fileExtension === 'json') contentType = 'application/json';
  if (fileExtension === 'csv') contentType = 'text/csv';
  if (fileExtension === 'html') contentType = 'text/html';
  if (fileExtension === 'css') contentType = 'text/css';
  if (fileExtension === 'js') contentType = 'application/javascript';
  if (fileExtension === 'xml') contentType = 'application/xml';
  if (fileExtension === 'svg') contentType = 'image/svg+xml';
  if (fileExtension === 'zip') contentType = 'application/zip';
  if (fileExtension === 'mp3') contentType = 'audio/mpeg';
  if (fileExtension === 'wav') contentType = 'audio/wav';
  const headers = new Headers(response.headers);
  headers.set('Content-Type', contentType);

  // Force download for executable file types (HTML, JS, CSS, XML, SVG) to prevent malware execution
  // Keep inline for safe media types (images, videos, audio, PDF, text, JSON, CSV)
  const executableExtensions = ['html', 'htm', 'js', 'css', 'xml', 'svg'];
  const shouldForceDownload = executableExtensions.includes(fileExtension);

  if (shouldForceDownload) {
    // Force download for potentially dangerous file types
    headers.set('Content-Disposition', result.filename ? `attachment; filename=\"${result.filename}\"` : 'attachment');
  } else {
    // Display inline for safe media types
    headers.set('Content-Disposition', result.filename ? `inline; filename=\"${result.filename}\"` : 'inline');
  }
  const responseToCache = new Response(response.body, { status: response.status, headers });
  await cache.put(cacheKey, responseToCache.clone());
  return responseToCache;
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
