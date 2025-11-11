# Contributing

Thank you for your interest in contributing to this project!

## Commit Conventions

This project follows a lightweight commit convention to keep the history clean and searchable.

### Format

```
<type>: <description>
```

### Types

- **feat**: New user-facing feature or capability
- **fix**: Bug fix
- **tech**: Technical improvements, refactoring, architecture changes, performance
- **ci**: CI/CD, GitHub Actions, deployment pipelines, automation
- **test**: Adding or updating tests
- **docs**: Documentation, README, comments
- **chore**: Dependencies, package updates, routine maintenance

### Rules

1. **Keep it concise**: First line under 72 characters
2. **Use lowercase**: After the colon, keep description lowercase
3. **No period**: Don't end with a period
4. **Imperative mood**: Use "add" not "added", "fix" not "fixed"
5. **Be specific**: Describe what changed, not how or why

### Examples

```bash
# Good
feat: add user authentication with JWT
fix: resolve race condition in token refresh
tech: extract auth logic into service layer
ci: add GitHub Actions workflow for tests
test: add integration tests for auth endpoints
docs: update API documentation
chore: bump dependencies to latest versions

# Avoid
feat: added some new stuff
fix: bug fix
tech: refactored things
chore: updates
```

### Why These Conventions?

- **Searchable**: `git log --grep="feat:"` to find all features
- **Scannable**: Quickly understand what changed at a glance
- **Professional**: Clean history for contributors and users
- **Flexible**: Detailed when needed, brief when obvious

## Development Workflow

1. Fork the repository
2. Create a feature branch: `git checkout -b feat/your-feature`
3. Make your changes following the commit conventions
4. Run tests: `bun test`
5. Push and create a pull request

## Questions?

Open an issue if you have questions about contributing!
