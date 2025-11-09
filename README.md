# Starling Server

A secure, production-ready backend server for the [Starling](https://github.com/byearlybird/starling) password manager. Built with [Bun](https://bun.sh), TypeScript, and Hono for blazing-fast performance and developer experience.

## Features

- **Secure Authentication**: JWT-based authentication with access and refresh tokens
- **Token Rotation**: Automatic refresh token rotation for enhanced security
- **Encrypted Storage**: User data stored with client-side encryption
- **Password Hashing**: Uses Bun's built-in Argon2 password hashing
- **Collection Sync**: Merge and sync password collections across devices
- **Type-Safe**: Full TypeScript support with Zod validation
- **Fast & Modern**: Built on Bun runtime for superior performance

## Prerequisites

- [Bun](https://bun.sh) v1.3.0 or later
- Git

## Quick Start

### 1. Clone the repository

```bash
git clone https://github.com/byearlybird/starling-server.git
cd starling-server
```

### 2. Install dependencies

```bash
bun install
```

### 3. Configure environment variables

Copy the example environment file and update with your secrets:

```bash
cp .env.example .env
```

Edit `.env` and set secure values for:
- `ACCESS_TOKEN_SECRET`: Secret for signing access tokens
- `REFRESH_TOKEN_SECRET`: Secret for signing refresh tokens

**Important**: Use strong, random secrets in production. You can generate them with:

```bash
# Generate a secure random secret
openssl rand -base64 32
```

### 4. Start the development server

```bash
bun dev
```

The server will start at `http://localhost:3000` with hot reloading enabled.

### 5. Production deployment

```bash
bun start
```

## API Endpoints

### Authentication

#### Sign Up
```http
POST /api/auth/signup
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "securepassword",
  "encryptedMasterKey": "encrypted_key_here"
}
```

#### Sign In
```http
POST /api/auth/signin
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "securepassword"
}
```

Returns access token and refresh token.

#### Refresh Token
```http
POST /api/auth/refresh
Content-Type: application/json

{
  "refreshToken": "your_refresh_token"
}
```

#### Sign Out
```http
POST /api/auth/signout
Content-Type: application/json

{
  "refreshToken": "your_refresh_token"
}
```

### Collections

All collection endpoints require authentication via Bearer token.

#### Get Collection
```http
GET /api/collection/:collectionName
Authorization: Bearer <access_token>
```

#### Merge Collection
```http
POST /api/collection/:collectionName/merge
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "collection": { /* collection data */ }
}
```

## Project Structure

```
starling-server/
├── src/
│   ├── index.tsx          # Server entry point
│   ├── api.ts             # API routes setup
│   ├── env.ts             # Environment configuration
│   ├── routes/
│   │   ├── auth.ts        # Authentication routes
│   │   └── collection.ts  # Collection management routes
│   └── services/
│       ├── auth/          # Authentication service
│       │   ├── service.ts
│       │   ├── token.ts   # JWT token management
│       │   └── schemas.ts # Zod validation schemas
│       └── collection/    # Collection service
│           ├── service.ts
│           └── schemas.ts
├── bruno/                 # API test collections
├── .env.example           # Environment variables template
├── package.json
└── README.md
```

## Development

### Running Tests

```bash
bun test
```

### Linting

```bash
bun run lint
```

### Formatting

```bash
bun run format
```

### API Testing

The repository includes [Bruno](https://www.usebruno.com/) API test collections in the `bruno/` directory. Install Bruno and open the collection to test the API endpoints.

## Security Best Practices

1. **Never commit `.env` files** - They are gitignored by default
2. **Use strong secrets** - Generate cryptographically secure random strings for token secrets
3. **HTTPS in production** - Always use HTTPS in production environments
4. **Regular updates** - Keep dependencies updated for security patches
5. **Rate limiting** - Consider adding rate limiting for production deployments
6. **CORS configuration** - Configure CORS appropriately for your frontend

## Environment Variables

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `ACCESS_TOKEN_SECRET` | Secret for signing access tokens | - | Yes |
| `REFRESH_TOKEN_SECRET` | Secret for signing refresh tokens | - | Yes |
| `ACCESS_TOKEN_EXPIRY` | Access token expiry in seconds | 900 (15 min) | No |
| `REFRESH_TOKEN_EXPIRY` | Refresh token expiry in seconds | 604800 (7 days) | No |
| `NODE_ENV` | Environment mode | development | No |

## Deployment

### Using Docker (coming soon)

```bash
# Build image
docker build -t starling-server .

# Run container
docker run -p 3000:3000 --env-file .env starling-server
```

### Using Bun directly

```bash
# Install dependencies
bun install --production

# Start server
NODE_ENV=production bun start
```

## Contributing

Contributions are welcome! Please read [CONTRIBUTING.md](CONTRIBUTING.md) for details on our code of conduct and the process for submitting pull requests.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- Built with [Bun](https://bun.sh) - The fast all-in-one JavaScript runtime
- [Hono](https://hono.dev) - Ultrafast web framework
- [Starling](https://github.com/byearlybird/starling) - The password manager this server supports

## Support

- **Issues**: [GitHub Issues](https://github.com/byearlybird/starling-server/issues)
- **Discussions**: [GitHub Discussions](https://github.com/byearlybird/starling-server/discussions)

## Related Projects

- [Starling](https://github.com/byearlybird/starling) - The Starling password manager client

---

Made with ❤️ by [byearlybird](https://github.com/byearlybird)
