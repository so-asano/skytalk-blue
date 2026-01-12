# SkyTalk.Blue

A forum/discussion board built on the AT Protocol.

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
- `blue.skytalk.talk.reaction` - Reaction records
- `blue.skytalk.talk.permissionSet` - Permission set records

## Development

### Prerequisites

- Node.js 22+
- pnpm 9+
- Docker (for PostgreSQL)

### Setup

```bash
# Install dependencies
pnpm install

# Start PostgreSQL with Docker
docker compose up -d

# Set up environment variables
cp .env.example .env
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env.local
# Edit .env files as needed (API_SECRET must match between api and web)
# Modify docker-compose.yml if you need to change ports or credentials

# Run database migrations
pnpm --filter api db:push

# Start development servers
pnpm dev
```

### Environment Variables

**Root `.env`**
```
DATABASE_URL=postgresql://skytalkblue:skytalkblue@localhost:5432/skytalkblue
```

**`apps/api/.env`**
```
DATABASE_URL=postgresql://skytalkblue:skytalkblue@localhost:5432/skytalkblue
API_SECRET=your-secret-key
```

**`apps/web/.env.local`**
```
NEXT_PUBLIC_URL=http://localhost:3000
NEXT_PUBLIC_API_URL=http://localhost:3001
NEXT_PUBLIC_API_SECRET=your-secret-key
```

## Tech Stack

- **Frontend**: Next.js 15, React 19, Tailwind CSS, shadcn/ui
- **Backend**: Express, Drizzle ORM, PostgreSQL
- **AT Protocol**: @atproto/api, @atproto/oauth-client-browser, @skyware/jetstream
- **Build**: Turborepo, pnpm workspaces

## License

MIT
