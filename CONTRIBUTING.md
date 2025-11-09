# Contributing to Starling Server

Thank you for your interest in contributing to Starling Server! This document provides guidelines and instructions for contributing.

## Code of Conduct

By participating in this project, you agree to maintain a respectful and inclusive environment for everyone.

## How Can I Contribute?

### Reporting Bugs

Before creating a bug report, please check existing issues to avoid duplicates.

When creating a bug report, include:

- **Clear title and description**
- **Steps to reproduce** the issue
- **Expected behavior** vs **actual behavior**
- **Environment details** (OS, Bun version, etc.)
- **Error messages or logs** if applicable

### Suggesting Features

We welcome feature suggestions! Please:

- Check if the feature has already been suggested
- Provide a clear use case and rationale
- Describe the proposed solution
- Consider alternative approaches

### Pull Requests

1. **Fork the repository** and create your branch from `main`
2. **Install dependencies**: `bun install`
3. **Make your changes** following our coding standards
4. **Add tests** for new functionality
5. **Run tests**: `bun test`
6. **Run linter**: `bun run lint`
7. **Format code**: `bun run format`
8. **Commit your changes** with clear commit messages
9. **Push to your fork** and submit a pull request

## Development Setup

### Prerequisites

- [Bun](https://bun.sh) v1.3.0 or later
- Git

### Installation

```bash
# Clone your fork
git clone https://github.com/YOUR_USERNAME/starling-server.git
cd starling-server

# Install dependencies
bun install

# Copy environment file
cp .env.example .env

# Start development server
bun dev
```

## Coding Standards

### TypeScript

- Use TypeScript for all new code
- Avoid `any` types - use proper typing
- Use Zod for runtime validation schemas

### Code Style

We use [Biome](https://biomejs.dev/) for linting and formatting:

```bash
# Check code
bun run lint

# Format code
bun run format
```

### Naming Conventions

- Use `camelCase` for variables and functions
- Use `PascalCase` for classes and types
- Use descriptive names that convey intent
- Prefix private class members with `#`

### File Organization

- Place routes in `src/routes/`
- Place services in `src/services/`
- Co-locate tests with the code they test (`*.test.ts`)
- Export schemas from `schemas.ts` files

## Testing

- Write tests for new features and bug fixes
- Place tests alongside the code (`filename.test.ts`)
- Use descriptive test names

```typescript
import { test, expect } from "bun:test";

test("should hash password correctly", async () => {
  // Test implementation
});
```

Run tests with:

```bash
bun test
```

## Commit Messages

Write clear, concise commit messages following this format:

```
<type>: <subject>

<body (optional)>
```

Types:
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, etc.)
- `refactor`: Code refactoring
- `test`: Adding or updating tests
- `chore`: Maintenance tasks

Examples:
```
feat: Add rate limiting to auth endpoints

fix: Prevent token expiry race condition

docs: Update API endpoint documentation
```

## Security

### Reporting Security Vulnerabilities

**Do not** open public issues for security vulnerabilities. Instead, please email the maintainers directly at [security contact].

### Security Best Practices

- Never commit secrets, API keys, or credentials
- Use environment variables for sensitive data
- Validate all user input
- Use parameterized queries to prevent SQL injection
- Keep dependencies updated

## Pull Request Process

1. **Update documentation** if you're changing functionality
2. **Add tests** for new features or bug fixes
3. **Ensure all tests pass**: `bun test`
4. **Ensure linting passes**: `bun run lint`
5. **Update CHANGELOG** if applicable
6. **Request review** from maintainers
7. **Address feedback** promptly and professionally

### PR Title Format

Use the same format as commit messages:

```
feat: Add rate limiting middleware
fix: Resolve token refresh race condition
docs: Improve installation instructions
```

## Project Structure

```
starling-server/
├── src/
│   ├── index.tsx          # Server entry point
│   ├── api.ts             # API setup
│   ├── env.ts             # Environment config
│   ├── routes/            # API route handlers
│   └── services/          # Business logic
├── bruno/                 # API test collections
├── .env.example           # Environment template
└── package.json
```

## Getting Help

- **Issues**: [GitHub Issues](https://github.com/byearlybird/starling-server/issues)
- **Discussions**: [GitHub Discussions](https://github.com/byearlybird/starling-server/discussions)

## Recognition

Contributors will be recognized in:
- The project README
- Release notes
- The GitHub contributors page

## License

By contributing, you agree that your contributions will be licensed under the MIT License.

---

Thank you for contributing to Starling Server!
