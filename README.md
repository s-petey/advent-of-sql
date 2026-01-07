# advent-sql

A CLI tool for managing Advent of SQL challenges with Effect and PostgreSQL.

## Prerequisites

- [Bun](https://bun.sh) v1.2.18 or higher
- PostgreSQL running on `localhost:5432`
- Default credentials: `postgres/postgres`

## Installation

```bash
bun install
```

## CLI Commands

The CLI provides three main commands to work with Advent of SQL challenges:

### 1. Create New Challenge Files

```bash
bun run index.ts new [day] [year]
```

Creates template files for a specific day and year. If no arguments are provided, defaults to the current day and year.

**Examples:**

```bash
# Create files for today
bun run index.ts new

# Create files for day 15 of current year
bun run index.ts new 15

# Create files for day 20 of 2024
bun run index.ts new 20 2024
```

**Generated files:**

- `{year}/{day}.ts` - TypeScript solution template with Effect and SQL client setup
- `{year}/{day}.sql` - SQL reset script for database initialization

### 2. Run a Challenge

```bash
bun run index.ts run [day] [year]
```

Runs the TypeScript solution for a specific day. Defaults to current day and year if not specified.

**Examples:**

```bash
# Run today's challenge
bun run index.ts run

# Run day 12 of current year
bun run index.ts run 12

# Run day 18 of 2025
bun run index.ts run 18 2025
```

### 3. Watch Mode (Recommended for doing challenges)

```bash
bun run index.ts watch [day] [year]
```

Runs the challenge in watch mode with automatic reloading and interactive commands. This is the recommended mode for working on the challenges.

**Examples:**

```bash
# Watch today's challenge
bun run index.ts watch

# Watch day 15 of 2025
bun run index.ts watch 15 2025
```

**Interactive Commands in Watch Mode:**

- `Enter` - Manually re-run the current file
- `R` - Reset database with SQL file and re-run
- `?` - Show help message
- `Ctrl+C` - Exit watch mode

**Features:**

- Auto-runs on file save
- Detects and pauses on errors
- Database reset with SQL scripts
- Color-coded output for better visibility

## Database Setup

The CLI expects PostgreSQL to be running with the following default configuration:

- **Host:** `localhost`
- **Port:** `5432`
- **Database:** `postgres`
- **Username:** `postgres`
- **Password:** `postgres`

You can start PostgreSQL using Docker Compose if available:

```bash
docker-compose up -d
```

## Example Workflow

1. **Create new challenge files:**

   ```bash
   bun run index.ts new 25 2025
   ```

2. **Edit the SQL reset script** (`2025/25.sql`) to set up your database schema and test data.

3. **Develop your solution** in watch mode:

   ```bash
   bun run index.ts watch 25 2025
   ```

4. **Use `R` in watch mode** to reset the database whenever needed.

5. **The file auto-runs** on save, showing results immediately.

## Technology Stack

- **Runtime:** [Bun](https://bun.sh)
- **Effect System:** [Effect-TS](https://effect.website/)
- **Database:** PostgreSQL via `@effect/sql-pg`
- **CLI Framework:** `@effect/cli`
