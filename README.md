# NYT Reader

A Kindle-friendly NY Times reader. Fetches top stories, scrapes article content, and serves a paginated UI optimized for e-ink displays.

## Setup

```bash
bun install
```

Add to `.env`:
```
NYT_API_KEY=your_api_key
NYT_COOKIES=your_nyt_session_cookies
```

## Usage

Fetch today's articles:
```bash
bun run src/index.ts
```

Start the reader:
```bash
bun run src/server.ts
```

Open `http://localhost:3000` on your Kindle.
