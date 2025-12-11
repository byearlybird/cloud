# @byearlybird/cloud-client

Type-safe client SDK for [@byearlybird/cloud](../../apps/cloud) with framework-agnostic state management.

## Features

- 🔒 **Type-Safe RPC Client** - Full type inference from API routes using Hono's RPC client
- 🔄 **Framework-Agnostic State** - Built on TanStack Store, works with any framework
- 🔐 **Auth Management** - Complete auth flow with automatic token refresh
- 📦 **Zero Config** - Types are automatically synced from the API

## Installation

```bash
bun add @byearlybird/cloud-client
```

## Quick Start

```typescript
import { createClient, createAuthStore } from '@byearlybird/cloud-client'

// Create RPC client with full type safety
const client = createClient('http://localhost:3000')

// Create auth store
const auth = createAuthStore(client)

// Sign up a new user
await auth.signUp(
  'user@example.com',
  'securePassword123',
  'encrypted-master-key'
)

// Access current state
console.log(auth.store.state.user)
console.log(auth.store.state.isAuthenticated)

// Subscribe to state changes
const unsubscribe = auth.store.subscribe(() => {
  console.log('Auth state changed:', auth.store.state)
})
```

## API Reference

### `createClient(baseUrl: string)`

Creates a type-safe RPC client for the Cloud API.

**Parameters**:
- `baseUrl` - The base URL of the API server (e.g., `"http://localhost:3000"`)

**Returns**: Type-safe client with inferred types from API routes

**Example**:
```typescript
const client = createClient('http://localhost:3000')

// All methods are fully typed
const response = await client.auth.signup.$post({
  json: {
    email: 'user@example.com',
    password: 'password123',
    encryptedMasterKey: 'key'
  }
})
```

### `createAuthStore(client: Client)`

Creates an auth store with state management and auth methods.

**Parameters**:
- `client` - The RPC client instance

**Returns**: Auth store instance with the following:

#### Properties

- `store` - TanStack Store instance containing auth state

#### State Shape

```typescript
{
  user: User | null
  accessToken: string | null
  refreshToken: string | null
  isAuthenticated: boolean
  isLoading: boolean
  error: string | null
}
```

#### Methods

##### `signUp(email, password, encryptedMasterKey)`

Sign up a new user.

```typescript
await auth.signUp(
  'user@example.com',
  'password123',
  'encrypted-master-key'
)
```

##### `signIn(email, password)`

Sign in an existing user.

```typescript
await auth.signIn('user@example.com', 'password123')
```

##### `refresh()`

Refresh the access token using the current refresh token.

```typescript
await auth.refresh()
```

##### `signOut()`

Sign out the current user and revoke tokens.

```typescript
await auth.signOut()
```

##### `getAccessToken()`

Get the current access token (useful for making authenticated requests).

```typescript
const token = auth.getAccessToken()
```

## Framework Integration

### Vanilla JavaScript

```typescript
const auth = createAuthStore(client)

// Subscribe to changes
auth.store.subscribe(() => {
  updateUI(auth.store.state)
})

// Sign in
document.getElementById('login-form').onsubmit = async (e) => {
  e.preventDefault()
  await auth.signIn(email, password)
}
```

### React (using useSyncExternalStore)

```typescript
import { useSyncExternalStore } from 'react'

function useAuthStore(auth: AuthStore) {
  return useSyncExternalStore(
    auth.store.subscribe,
    () => auth.store.state,
    () => auth.store.state
  )
}

function App() {
  const state = useAuthStore(auth)

  return (
    <div>
      {state.isAuthenticated ? (
        <p>Welcome, {state.user?.email}</p>
      ) : (
        <button onClick={() => auth.signIn(email, password)}>
          Sign In
        </button>
      )}
    </div>
  )
}
```

### Vue

```vue
<script setup>
import { ref, onMounted, onUnmounted } from 'vue'

const authState = ref(auth.store.state)

const unsubscribe = auth.store.subscribe(() => {
  authState.value = auth.store.state
})

onUnmounted(() => unsubscribe())
</script>

<template>
  <div v-if="authState.isAuthenticated">
    Welcome, {{ authState.user?.email }}
  </div>
</template>
```

### Svelte

```svelte
<script>
  import { writable } from 'svelte/store'

  const authState = writable(auth.store.state)
  auth.store.subscribe(() => {
    authState.set(auth.store.state)
  })
</script>

{#if $authState.isAuthenticated}
  <p>Welcome, {$authState.user?.email}</p>
{/if}
```

## Type Safety

The client automatically infers all types from the API:

```typescript
// ✅ Correct types
const response = await client.auth.signup.$post({
  json: {
    email: 'user@example.com',      // ✅ string
    password: 'password123',         // ✅ string
    encryptedMasterKey: 'key'       // ✅ string
  }
})

// ❌ TypeScript error - missing field
const response = await client.auth.signup.$post({
  json: {
    email: 'user@example.com',
    password: 'password123'
    // Error: Property 'encryptedMasterKey' is missing
  }
})
```

## Error Handling

All methods throw errors that should be caught:

```typescript
try {
  await auth.signIn('user@example.com', 'wrong-password')
} catch (error) {
  console.error('Sign in failed:', error.message)
  // Auth state will have error set
  console.log(auth.store.state.error)
}
```

## Development

Build the package:

```bash
bun run build
```

Build types only:

```bash
bun run build:types
```

Watch mode:

```bash
bun run dev
```

## License

See LICENSE file for details.
