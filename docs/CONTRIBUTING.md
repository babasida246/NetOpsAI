# Contributing Guide

Guidelines for contributing to NetOpsAI Gateway.

## Table of Contents

- [Getting Started](#getting-started)
- [Development Workflow](#development-workflow)
- [Branching Strategy](#branching-strategy)
- [Commit Messages](#commit-messages)
- [Pull Request Process](#pull-request-process)
- [Code Review](#code-review)
- [Release Process](#release-process)

---

## Getting Started

### Prerequisites

- Node.js 20+
- pnpm 8+
- Docker 24+
- Git 2.40+

### Setup

```bash
# Fork and clone
git clone https://github.com/<your-username>/NetOpsAI.git
cd NetOpsAI

# Add upstream remote
git remote add upstream https://github.com/babasida246/NetOpsAI.git

# Install dependencies
pnpm install

# Copy environment
cp .env.example .env

# Start services
docker-compose up -d postgres redis

# Run development
pnpm dev
```

---

## Development Workflow

### Daily Workflow

```bash
# 1. Sync with upstream
git checkout main
git pull upstream main

# 2. Create feature branch
git checkout -b feature/my-feature

# 3. Make changes
# ... code ...

# 4. Run tests
pnpm test
pnpm lint

# 5. Commit changes
git add .
git commit -m "feat: add new feature"

# 6. Push and create PR
git push origin feature/my-feature
```

### Before Submitting

- [ ] Tests pass (`pnpm test`)
- [ ] Linting passes (`pnpm lint`)
- [ ] Types check (`pnpm typecheck`)
- [ ] Build succeeds (`pnpm build`)
- [ ] Documentation updated if needed

---

## Branching Strategy

### Branch Types

| Prefix | Purpose | Example |
|--------|---------|---------|
| `feature/` | New features | `feature/asset-import` |
| `fix/` | Bug fixes | `fix/login-error` |
| `refactor/` | Code refactoring | `refactor/auth-module` |
| `docs/` | Documentation | `docs/api-reference` |
| `chore/` | Maintenance | `chore/update-deps` |
| `test/` | Test improvements | `test/add-unit-tests` |

### Branch Naming

```
<type>/<short-description>

Examples:
feature/multi-tenant-support
fix/conversation-pagination
docs/deployment-guide
```

### Protected Branches

| Branch | Protection |
|--------|------------|
| `main` | Require PR, CI pass, 1 review |
| `develop` | Require PR, CI pass |

---

## Commit Messages

### Format

```
<type>(<scope>): <subject>

<body>

<footer>
```

### Types

| Type | Description |
|------|-------------|
| `feat` | New feature |
| `fix` | Bug fix |
| `docs` | Documentation |
| `style` | Formatting (no code change) |
| `refactor` | Code refactoring |
| `test` | Adding tests |
| `chore` | Maintenance |
| `perf` | Performance improvement |
| `ci` | CI/CD changes |

### Examples

```bash
# Feature
feat(assets): add bulk import functionality

# Bug fix
fix(auth): resolve token refresh race condition

# Documentation
docs(api): update authentication examples

# Breaking change
feat(api)!: change response format for /assets

BREAKING CHANGE: The response now wraps data in a `data` field
```

### Rules

- Use imperative mood: "add" not "added" or "adds"
- Subject line max 50 characters
- Body wrap at 72 characters
- Reference issues: "Fixes #123"

---

## Pull Request Process

### Creating a PR

1. **Title**: Follow commit message format
   ```
   feat(assets): add bulk import functionality
   ```

2. **Description**: Use template

```markdown
## Summary
Brief description of changes.

## Changes
- Added bulk import API endpoint
- Created import validation service
- Added unit tests

## Testing
- [ ] Unit tests added
- [ ] Integration tests added
- [ ] Manual testing completed

## Related Issues
Fixes #123

## Screenshots (if UI changes)
```

### PR Size Guidelines

| Size | Lines Changed | Review Time |
|------|---------------|-------------|
| Small | < 100 | Quick |
| Medium | 100-500 | Same day |
| Large | 500+ | Consider splitting |

### Checklist

- [ ] Branch up to date with main
- [ ] All tests passing
- [ ] No linting errors
- [ ] Documentation updated
- [ ] Changelog updated (if applicable)
- [ ] Self-review completed

---

## Code Review

### For Authors

- Respond to feedback promptly
- Explain reasoning when disagreeing
- Mark conversations resolved after addressing
- Request re-review after changes

### For Reviewers

**Focus on:**
- Logic correctness
- Edge cases
- Security implications
- Performance concerns
- Code readability
- Test coverage

**Comment Prefixes:**
- `nit:` - Minor suggestion, non-blocking
- `question:` - Asking for clarification
- `suggestion:` - Improvement idea
- `issue:` - Must be addressed

### Review Checklist

- [ ] Code follows project style
- [ ] Logic is correct
- [ ] Edge cases handled
- [ ] Error handling appropriate
- [ ] Tests cover changes
- [ ] No security vulnerabilities
- [ ] No performance regressions

---

## Release Process

### Version Numbering

Following [Semantic Versioning](https://semver.org/):

```
MAJOR.MINOR.PATCH

1.0.0 → 1.0.1 (patch: bug fix)
1.0.1 → 1.1.0 (minor: new feature)
1.1.0 → 2.0.0 (major: breaking change)
```

### Release Steps

1. **Prepare release branch**
   ```bash
   git checkout -b release/v1.2.0
   ```

2. **Update version**
   ```bash
   pnpm version minor
   ```

3. **Update CHANGELOG**
   ```markdown
   ## [1.2.0] - 2024-01-15

   ### Added
   - Bulk import feature

   ### Fixed
   - Token refresh issue
   ```

4. **Create PR to main**

5. **After merge, tag release**
   ```bash
   git tag v1.2.0
   git push origin v1.2.0
   ```

---

## Getting Help

### Resources

- [Development Guide](DEVELOPMENT.md)
- [Architecture](ARCHITECTURE.md)
- [API Reference](API.md)

### Questions?

- Open a [Discussion](https://github.com/babasida246/NetOpsAI/discussions)
- Check existing issues
- Review documentation

---

## Code of Conduct

### Our Standards

- Be respectful and inclusive
- Provide constructive feedback
- Accept constructive criticism
- Focus on what's best for the community

### Enforcement

Violations may result in:
1. Warning
2. Temporary ban
3. Permanent ban

---

Thank you for contributing to NetOpsAI Gateway! 🚀
