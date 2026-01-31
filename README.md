# TelRead

Telegram channel reader. Unified timeline like Twitter.

**[Live Demo](https://lyosu.github.io/telread/)** | **[Deploy your own](#deploy)**

---

## What

- Unified feed from all your channels
- Comments & replies
- Media (photos, videos, video notes)
- Local bookmarks
- QR login
- PWA

Runs in browser. No backend. Your session stays on your device.

## Deploy

### Quick

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2FLyoSU%2Ftelread&env=VITE_TELEGRAM_API_ID,VITE_TELEGRAM_API_HASH&envDescription=Telegram%20API%20credentials%20from%20my.telegram.org)
[![Deploy to Netlify](https://www.netlify.com/img/deploy/button.svg)](https://app.netlify.com/start/deploy?repository=https://github.com/LyoSU/telread)

Set env vars:
- `VITE_TELEGRAM_API_ID`
- `VITE_TELEGRAM_API_HASH`

Get credentials at [my.telegram.org](https://my.telegram.org)

### Manual

```bash
cp .env.example .env
# edit .env with your credentials
npm install
npm run dev
```

## Stack

[SolidJS](https://solidjs.com) / [mtcute](https://mtcute.dev) / [TanStack Query](https://tanstack.com/query) / [Tailwind](https://tailwindcss.com) / [Vite](https://vite.dev)

## License

[AGPL-3.0](LICENSE)
