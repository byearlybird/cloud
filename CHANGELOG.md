# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Prepared repository for public release
- Comprehensive documentation (README, CONTRIBUTING, SECURITY, CODE_OF_CONDUCT)
- GitHub issue and PR templates
- MIT License

## [0.1.0] - 2025-11-09

### Added
- JWT-based authentication with access and refresh tokens
- Token rotation for enhanced security
- User sign-up, sign-in, and sign-out endpoints
- Password hashing using Argon2
- Collection sync and merge functionality
- TypeScript support with Zod validation
- RESTful API built with Hono framework
- Environment-based configuration
- Bruno API test collections

### Security
- Secure password hashing with Argon2
- JWT token-based authentication
- Refresh token revocation
- Client-side encryption support for master keys

[Unreleased]: https://github.com/byearlybird/starling-server/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/byearlybird/starling-server/releases/tag/v0.1.0
