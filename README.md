# TelRead

Telegram channel reader with a unified timeline. Read your subscribed channels like a Twitter feed.

Built with SolidJS, mtcute, and Tailwind CSS. Runs entirely in browser via MTProto.

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

## Tech

- [SolidJS](https://solidjs.com) - UI
- [mtcute](https://mtcute.dev) - Telegram MTProto client
- [TanStack Query](https://tanstack.com/query) - Data fetching
- [Tailwind CSS](https://tailwindcss.com) - Styling
- [Vite](https://vite.dev) - Build

## License

AGPL-3.0 - see [LICENSE](LICENSE)
