# SvelteKit Coding Agent Guide

This guide is for AI coding agents working in the SvelteKit monorepo.

**Important:** Read and follow `CONTRIBUTING.md` as well - it contains essential information about testing, code structure, and contribution guidelines that applies here.

## Quick Reference

### Essential Commands

```bash
# Initial setup (takes 3-4 minutes, set 10+ min timeout)
pnpm install --frozen-lockfile

# Build all packages (~1-2 seconds)
pnpm build

# Format code (~15 seconds)
pnpm run format

# Lint (takes 2-3 minutes, set 5+ min timeout)
pnpm run lint

# Type checking (takes 3-4 minutes, set 8+ min timeout)
pnpm run check
```

### Testing Commands

```bash
# Unit tests only (fastest - ~6 seconds)
pnpm -F @sveltejs/kit test:unit

# Run a single unit test file
pnpm -F @sveltejs/kit test:unit:dev path/to/test.spec.js

# Integration tests (10-30 minutes, set 60+ min timeout)
pnpm test:kit

# A single integration test suite (name of suite found in packages/kit/test/apps/*/package.json)
pnpm -F {name-of-suite} test

# Run single Playwright test (must use workdir - no pnpm -F shorthand)
cd packages/kit/test/apps/basics && npx playwright test --grep "test name"

# Other package tests (5-15 minutes, set 30+ min timeout)
pnpm test:others
```

### Pre-submission Checklist

1. `pnpm run format` - Auto-format code
2. `pnpm run lint` - Check code style (don't cancel early)
3. `pnpm run check` - Type checking (don't cancel early)
4. `pnpm -F @sveltejs/kit test:unit` - Run unit tests
5. For @sveltejs/kit changes: `pnpm -F @sveltejs/kit prepublishOnly` - Generate types
6. Run `pnpm changeset` to document changes (prefix with `fix`, `feat`, `breaking`, or `chore`)

## Code Style Examples

The coding style guidelines are in `CONTRIBUTING.md`. Here are additional examples:

### Imports

```javascript
// JSDoc type imports at the top
/** @import { Handle, RequestEvent } from '@sveltejs/kit' */

// Named imports (no default exports)
import { HttpError, SvelteKitError } from '@sveltejs/kit/internal';
```

### Functions

```javascript
// Exported named functions (no default exports)
export function coalesce_to_error(err) {
	// Implementation
}

// JSDoc for all parameters and return types
/**
 * @param {unknown} error
 * @returns {Error}
 */
export function coalesce_to_error(error) {
	// Implementation
}

// Use arrow functions for callbacks
const handler = (event) => {
	/* ... */
};
```

### Error Handling

```javascript
// Type checking with instanceof
if (error instanceof HttpError || error instanceof SvelteKitError) {
	// Handle
}

// Graceful fallbacks
const status = error?.status ?? 500;

// Optional chaining and nullish coalescing
const content_type = request.headers.get('content-type')?.split(';', 1)[0];
```

### TypeScript/JSDoc

- Use JSDoc annotations for all function parameters and return types
- Complex types: `/** @type {Array<{ type: string, subtype: string }>} */`
- Type casting when needed: `/** @type {Error} */ (err)`
- Enable strict mode: `checkJs: true`, `strict: true` in tsconfig.json

### Formatting (via Prettier)

- **Tabs for indentation** (not spaces)
- **Single quotes** for strings
- **No trailing commas**
- **100 character line width**
- Files are auto-formatted by `pnpm run format`

### Comments

````javascript
// JSDoc with usage examples for public APIs
/**
 * Sequence multiple handle functions
 *
 * @example
 * ```js
 * export const handle = sequence(first, second);
 * ```
 *
 * @param {...Handle} handlers
 * @returns {Handle}
 */

// Inline comments for clarifications
// no match equals invalid header — ignore
````

## Key Packages

- `@sveltejs/kit` - Main framework (`packages/kit/`)
- `adapter-*` - Platform adapters (node, cloudflare, netlify, vercel, static, auto)
- `@sveltejs/package` - Package building utilities
- `@sveltejs/enhanced-img` - Enhanced image component
- `@sveltejs/amp` - AMP support

## Troubleshooting

- **Browser tests fail**: `pnpm playwright install chromium`
- **Build failures**: Ensure `pnpm install --frozen-lockfile` completed
- **Type errors**: Run `pnpm -F @sveltejs/kit prepublishOnly`
- **Lint issues**: Run `pnpm run format` first
