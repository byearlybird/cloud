# Database Setup

This project uses Drizzle ORM with Bun's native SQLite driver (`bun:sqlite`) for data persistence.

## Installation

Due to current npm registry authentication issues, the Drizzle packages need to be installed manually:

```bash
# Install Drizzle ORM and Drizzle Kit
bun install
```

If you encounter 401 errors, you may need to:
1. Check npm registry authentication
2. Clear the Bun cache: `bun pm cache rm`
3. Verify network/proxy settings

## Required Packages

- `drizzle-orm@^0.38.3` - ORM library
- `drizzle-kit@^0.31.0` (dev dependency) - Migration and schema management tool

These are already added to `package.json`.

## Configuration

### Database Location

The database file location is controlled by the `DATABASE_PATH` environment variable:

```env
DATABASE_PATH=./data/cloud.db
```

If not set, it defaults to `./data/cloud.db`.

### Drizzle Configuration

Configuration is in `drizzle.config.ts`:
- Schema location: `./src/db/schema.ts`
- Migration output: `./drizzle/`
- SQLite dialect with WAL mode enabled

## Database Schema

The schema is defined in `/src/db/schema.ts` and includes:

### Tables

1. **users** - User authentication data
   - `id` (TEXT, PRIMARY KEY) - UUID
   - `email` (TEXT, UNIQUE) - User email
   - `hashedPassword` (TEXT) - Bcrypt hashed password
   - `encryptedMasterKey` (TEXT) - Client-side encrypted master key
   - `createdAt` (TEXT) - ISO 8601 datetime

2. **refreshTokens** - Revoked refresh token tracking
   - `id` (TEXT, PRIMARY KEY) - UUID
   - `userId` (TEXT, FOREIGN KEY) - References users.id
   - `tokenHash` (TEXT) - Bun.hash() of JWT token
   - `revokedAt` (TEXT) - ISO 8601 datetime
   - Unique index on `(userId, tokenHash)`

3. **documents** - User documents in JSON:API format
   - `id` (TEXT, PRIMARY KEY) - UUID
   - `userId` (TEXT, FOREIGN KEY) - References users.id
   - `documentKey` (TEXT) - Document identifier
   - `documentData` (TEXT) - JSON serialized JsonDocument<AnyObject>
   - Unique index on `(userId, documentKey)`

## Migration Workflow

### Generate Migration

After modifying the schema in `src/db/schema.ts`:

```bash
bun run db:generate
```

This creates a new migration file in `./drizzle/`.

### Apply Migrations

To apply pending migrations to the database:

```bash
bun run db:migrate
```

### Push Schema (Development)

For rapid prototyping, push schema changes directly without generating migration files:

```bash
bun run db:push
```

⚠️ **Warning**: This is suitable for development only. Use migrations for production.

### Drizzle Studio

Launch the visual database browser:

```bash
bun run db:studio
```

Opens a web interface at `https://local.drizzle.studio` to browse and edit data.

## Usage in Code

### Import the database instance

```typescript
import { db } from "./db";
import { users, documents, refreshTokens } from "./db/schema";

// Select
const allUsers = await db.select().from(users);

// Insert
await db.insert(users).values({
  id: crypto.randomUUID(),
  email: "user@example.com",
  hashedPassword: await Bun.password.hash("password"),
  encryptedMasterKey: "encrypted...",
  createdAt: new Date().toISOString(),
});

// Update
await db.update(users)
  .set({ email: "newemail@example.com" })
  .where(eq(users.id, userId));

// Delete
await db.delete(users).where(eq(users.id, userId));
```

### Type-safe queries

Drizzle provides full TypeScript type inference:

```typescript
import type { User, NewUser } from "./db/schema";

// User type includes all columns
const user: User = await db.query.users.findFirst();

// NewUser type for inserts (some fields optional)
const newUser: NewUser = {
  id: crypto.randomUUID(),
  email: "test@example.com",
  // ... other required fields
};
```

## Migration from KV Store

The current implementation uses a generic KV store. Here's the migration mapping:

| KV Pattern | New Table | Notes |
|------------|-----------|-------|
| `["auth", email]` | `users` | Key becomes `email` column |
| `["token", userId, tokenHash]` | `refreshTokens` | Store revocation info |
| `["document", userId, documentKey]` | `documents` | Document data stored as TEXT |

## Performance

- **WAL mode**: Enabled for better concurrency
- **Prepared statements**: Drizzle uses prepared statements automatically
- **Indexes**: Optimized for query patterns in the services
- **Foreign keys**: CASCADE deletion ensures referential integrity

## Environment Variables

```env
# Database file path (optional, defaults to ./data/cloud.db)
DATABASE_PATH=./data/cloud.db

# Server configuration (existing)
PORT=3000
NODE_ENV=production
ACCESS_TOKEN_SECRET=your-secret-here
REFRESH_TOKEN_SECRET=your-secret-here
ACCESS_TOKEN_EXPIRY=900
REFRESH_TOKEN_EXPIRY=604800
```

## Troubleshooting

### Database locked errors

If you see "database is locked" errors:
1. Ensure WAL mode is enabled (automatic in `src/db/index.ts`)
2. Check for long-running transactions
3. Verify no other processes are accessing the database

### Migration conflicts

If migrations fail:
```bash
# Reset and re-generate migrations (development only!)
rm -rf drizzle/
bun run db:generate
bun run db:migrate
```

### Type errors after schema changes

After modifying the schema:
1. Regenerate migrations: `bun run db:generate`
2. Restart TypeScript server in your editor
3. Rebuild types if needed: `bun run build:types`
