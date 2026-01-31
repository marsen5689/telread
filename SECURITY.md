# Security

## Reporting vulnerabilities

If you find a security issue, **do not** open a public issue.

Email: [your-email] with details.

Include:
- Description of the vulnerability
- Steps to reproduce
- Potential impact

I'll respond within 48 hours.

## Scope

This app runs entirely in browser. Your Telegram session is stored locally in IndexedDB.

Known considerations:
- API credentials are exposed in browser (unavoidable for client-side apps)
- Session data persists until you log out
- Media blob URLs have limited lifetime but may be accessible to other tabs
