# SkyTalk.Blue

A forum/discussion board built on the AT Protocol (Bluesky).

## Features

- **Channel-based discussions** - Organize threads into topic channels
- **Bluesky OAuth** - Login with your Bluesky account
- **Data ownership** - Threads and comments are stored in your PDS as AT Protocol records
- **Mentions & notifications** - @mention users to notify them
- **Markdown support** - GitHub Flavored Markdown in posts
- **i18n** - Japanese and English support
- **Dark mode** - Light/dark theme toggle

## Architecture

```
apps/
  api/     # Express API server
  web/     # Next.js frontend
lexicons/  # AT Protocol lexicon definitions
```

### Lexicons

- `blue.skytalk.talk.thread` - Thread records
- `blue.skytalk.talk.comment` - Comment records

## Development

### Prerequisites

- Node.js 20+
- pnpm 9+
- PostgreSQL

### Setup

```bash
# Install dependencies
pnpm install

# Set up environment variables
cp .env.example .env
# Edit .env with your database URL and API secret

# Run database migrations
pnpm --filter api db:push

# Start development servers
pnpm dev
```

### Environment Variables

```
DATABASE_URL=postgres://...
API_SECRET=your-secret-key
CORS_ORIGIN=http://localhost:3000
NEXT_PUBLIC_API_URL=http://localhost:3001
NEXT_PUBLIC_API_SECRET=your-secret-key
NEXT_PUBLIC_URL=http://localhost:3000
```

## Tech Stack

- **Frontend**: Next.js 15, React 19, Tailwind CSS, shadcn/ui
- **Backend**: Express, Drizzle ORM, PostgreSQL
- **AT Protocol**: @atproto/api, @atproto/oauth-client-browser, @skyware/jetstream
- **Build**: Turborepo, pnpm workspaces

## License

MIT
