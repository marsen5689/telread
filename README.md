# TelRead

Telegram channel reader with a unified timeline. Read your subscribed channels like a Twitter feed.

Built with SolidJS, mtcute, and Tailwind CSS. Runs entirely in browser via MTProto.

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2FAnomalyCo%2Ftelread&env=VITE_TELEGRAM_API_ID,VITE_TELEGRAM_API_HASH&envDescription=Telegram%20API%20credentials%20from%20my.telegram.org)
[![Deploy to Netlify](https://www.netlify.com/img/deploy/button.svg)](https://app.netlify.com/start/deploy?repository=https://github.com/AnomalyCo/telread)

## Features

- Unified timeline from all subscribed channels
- Individual channel views
- Comments and replies
- Media galleries (photos, videos, video notes)
- Bookmarks (local)
- QR code login
- PWA support

## Setup

1. Get API credentials from [my.telegram.org](https://my.telegram.org)

2. Create `.env`:
```
VITE_TELEGRAM_API_ID=your_api_id
VITE_TELEGRAM_API_HASH=your_api_hash
```

3. Install and run:
```bash
npm install
npm run dev
```

## Deploy

### One-click

Use the buttons above for Vercel/Netlify. You'll need to set environment variables:
- `VITE_TELEGRAM_API_ID`
- `VITE_TELEGRAM_API_HASH`

### GitHub Pages

1. Fork this repo
2. Go to Settings > Secrets > Actions
3. Add `VITE_TELEGRAM_API_ID` and `VITE_TELEGRAM_API_HASH`
4. Go to Settings > Pages > Source: GitHub Actions
5. Push to `master` branch

### Manual

```bash
npm run build
# Upload `dist/` to any static hosting
```

For subpath hosting (e.g., `user.github.io/telread`):
```bash
VITE_BASE=/telread/ npm run build
```

## Tech

- [SolidJS](https://solidjs.com) - UI
- [mtcute](https://mtcute.dev) - Telegram MTProto client
- [TanStack Query](https://tanstack.com/query) - Data fetching
- [Tailwind CSS](https://tailwindcss.com) - Styling
- [Vite](https://vite.dev) - Build

## License

AGPL-3.0 - see [LICENSE](LICENSE)
