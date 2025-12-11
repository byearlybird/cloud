# Cloud Monorepo

Zero-knowledge sync server with auth, end-to-end encryption, and type-safe client SDK.

## 📁 Structure

This is a Bun workspace monorepo containing:

- **apps/cloud** - API server with auth and document sync
- **packages/cloud-client** - Type-safe client SDK with framework-agnostic state management

## 🚀 Quick Start

Install dependencies:

```bash
bun install
```

Start the API server:

```bash
bun dev
```

Run for production:

```bash
bun start
```

## 📦 Packages

### apps/cloud

The backend API server built with:
- **Runtime**: Bun
- **Framework**: Hono
- **Database**: SQLite + Drizzle ORM
- **Auth**: JWT-based (access + refresh tokens)

**Scripts**:
```bash
bun run dev              # Start dev server with hot reload
bun run start            # Start production server
bun run test             # Run tests
bun run db:generate      # Generate database migrations
bun run db:migrate       # Run migrations
bun run db:push          # Push schema to database
bun run db:studio        # Open Drizzle Studio
```

### packages/cloud-client

Type-safe client SDK with:
- **RPC Client**: Hono's built-in RPC client with full type inference
- **State Management**: TanStack Store (framework-agnostic)
- **Features**: Auth store with signUp, signIn, refresh, signOut

**Installation**:
```bash
# In your app
bun add @byearlybird/cloud-client
```

**Usage**:
```typescript
import { createClient, createAuthStore } from '@byearlybird/cloud-client'

// Create RPC client
const client = createClient('http://localhost:3000')

// Create auth store
const auth = createAuthStore(client)

// Sign up
await auth.signUp('user@example.com', 'password123', 'encrypted-master-key')

// Access state
const state = auth.store.state
console.log(state.user, state.isAuthenticated)

// Subscribe to changes
auth.store.subscribe(() => {
  console.log('Auth state changed:', auth.store.state)
})

// Sign in
await auth.signIn('user@example.com', 'password123')

// Refresh tokens
await auth.refresh()

// Sign out
await auth.signOut()
```

**Scripts**:
```bash
bun run build            # Build for production
bun run build:types      # Generate TypeScript declarations
bun run dev              # Build in watch mode
```

## 🏗️ Architecture

### Type Safety

The client SDK uses Hono's RPC client to infer types directly from the API routes:

```typescript
// apps/cloud/src/app/index.ts exports AppType
export type AppType = AppRoutes

// packages/cloud-client uses it for type inference
const client = hc<AppType>('http://localhost:3000')
// Now client.auth.signup.$post() is fully typed!
```

### State Management

TanStack Store provides framework-agnostic reactive state:

```typescript
// Works with any framework (React, Vue, Svelte, vanilla JS)
const auth = createAuthStore(client)

// Subscribe to changes
const unsubscribe = auth.store.subscribe(() => {
  console.log('State updated:', auth.store.state)
})

// Clean up
unsubscribe()
```

## 🔧 Development

### Adding a New Package

```bash
mkdir -p packages/my-package/src
cd packages/my-package
bun init
```

Update root `package.json` workspaces if needed.

### Running Scripts

Use Bun's workspace filtering:

```bash
bun run --filter @byearlybird/cloud dev
bun run --filter @byearlybird/cloud-client build
```

### Database Migrations

```bash
# Generate migration from schema changes
bun db:generate

# Apply migrations
bun db:migrate

# Or push directly (dev only)
bun db:push
```

## 📝 Environment Variables

See `apps/cloud/.env.example` for required environment variables:

- `ACCESS_TOKEN_SECRET` - Secret for access token signing
- `REFRESH_TOKEN_SECRET` - Secret for refresh token signing
- `DATABASE_PATH` - Path to SQLite database (default: ./data/database.sqlite)

## 🧪 Testing

```bash
bun test
```

## 📄 License

See LICENSE file for details.
