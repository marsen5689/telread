# Contributing

PRs welcome.

## Dev setup

```bash
npm install
npm run dev
```

You'll need Telegram API credentials in `.env` (see `.env.example`).

## Code style

- TypeScript strict mode
- Prefer named exports
- Components in PascalCase
- Hooks start with `use`

## PR checklist

- [ ] `npm run build` passes
- [ ] `npm run typecheck` passes
- [ ] Tested manually

## Project structure

```
src/
  components/   # UI components
  lib/
    telegram/   # MTProto client wrapper
    query/      # TanStack Query hooks
    store/      # Zustand-like stores
  pages/        # Route pages
  layouts/      # Layout components
```

## Notes

- This is a SolidJS project, not React. Don't use React patterns.
- mtcute runs in browser via WASM. Heavy operations can block UI.
- Media URLs are blob URLs with limited lifetime.
