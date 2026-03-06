# PussyWatch 🐱

Cat sitting scheduler for a small group of friends.

## Setup

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## How it works

1. **Pick your name** — on first visit choose your name from the list, or add yourself
2. **Create a household** — represents a home with one or more cats
3. **Add cats** — give each cat a name, emoji, and optional care notes
4. **Request a sitter** — post a date range when you need someone to watch your cats
5. **Volunteer** — friends can tap "I'll do it" to claim an open request

## Data

Data is stored in a local SQLite file at `./data/pussy-watch.db`.

## Deployment

To run in production:

```bash
npm run build
npm start
```

Make sure the `data/` directory is writable and persisted (e.g. via a volume if using Docker).
