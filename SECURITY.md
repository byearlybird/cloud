# Security Policy

## Supported Versions

We release security updates for the following versions:

| Version | Supported          |
| ------- | ------------------ |
| 0.1.x   | :white_check_mark: |

## Reporting a Vulnerability

**Please do not report security vulnerabilities through public GitHub issues.**

If you discover a security vulnerability, please send an email to the maintainers with the following information:

- Type of vulnerability
- Full paths of source file(s) related to the vulnerability
- Location of the affected source code (tag/branch/commit or direct URL)
- Step-by-step instructions to reproduce the issue
- Proof-of-concept or exploit code (if possible)
- Impact of the vulnerability, including how an attacker might exploit it

### What to Expect

- You will receive a response within 48 hours acknowledging your report
- We will investigate the issue and determine its severity
- We will work on a fix and coordinate the release with you
- Once the fix is released, we will publicly acknowledge your responsible disclosure (unless you prefer to remain anonymous)

## Security Best Practices

When deploying Starling Server:

### Environment Variables

- **Never commit `.env` files** to version control
- Use strong, cryptographically random secrets for `ACCESS_TOKEN_SECRET` and `REFRESH_TOKEN_SECRET`
- Generate secrets using: `openssl rand -base64 32`
- Rotate secrets regularly in production

### Network Security

- **Always use HTTPS** in production environments
- Configure proper CORS policies for your frontend
- Use a reverse proxy (nginx, Caddy) for additional security
- Implement rate limiting to prevent abuse

### Access Control

- Keep refresh token expiry reasonable (7-30 days recommended)
- Keep access token expiry short (15-60 minutes recommended)
- Implement token revocation for compromised accounts
- Monitor for suspicious authentication patterns

### Data Protection

- User passwords are hashed using Argon2 (Bun's built-in implementation)
- Master keys should be encrypted client-side before transmission
- Storage is encrypted at rest when using appropriate storage drivers
- Sensitive data should never be logged

### Dependency Management

- Regularly update dependencies: `bun update`
- Review dependency security advisories
- Use `bun audit` (when available) to check for known vulnerabilities
- Pin dependency versions in production

### Deployment Security

- Run the server with minimal privileges (non-root user)
- Use environment-based configuration (never hardcode secrets)
- Implement proper logging and monitoring
- Set up automated backups of user data
- Use container security best practices if deploying with Docker

## Known Security Considerations

### Client-Side Encryption

This server expects clients to handle encryption of sensitive data (master keys, passwords) before transmission. The server:

- Stores encrypted master keys as provided by clients
- Does not have access to unencrypted passwords after hashing
- Relies on client-side implementation of encryption

### Token Storage

- Access tokens should be stored in memory only (never localStorage)
- Refresh tokens can be stored in httpOnly cookies or secure storage
- Implement token rotation (already built-in)

### Rate Limiting

The current implementation does not include rate limiting. For production deployments, we recommend:

- Implementing rate limiting middleware
- Using a reverse proxy with rate limiting (nginx, Caddy)
- Monitoring for brute-force attacks on authentication endpoints

## Security Updates

Security updates will be released as patch versions and announced via:

- GitHub Security Advisories
- Release notes
- Repository README

## Bug Bounty Program

We do not currently have a bug bounty program, but we greatly appreciate responsible disclosure of security vulnerabilities.

## Acknowledgments

We thank the following security researchers for their responsible disclosure:

<!-- List will be updated as vulnerabilities are reported and fixed -->

---

Thank you for helping keep Starling Server secure!
