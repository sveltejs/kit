# SvelteKit Development Instructions

SvelteKit is a web application framework for building modern web applications with Svelte. This is a monorepo containing @sveltejs/kit, adapters, and related packages.

**Always reference these instructions first and fallback to search or bash commands only when you encounter unexpected information that does not match the info here.**

## Working Effectively

### Prerequisites and Setup
- Install Node.js 18+ (current tested versions: 18, 20, 22, 24)
- Install pnpm globally: `npm install -g pnpm` (takes ~2 seconds)
- Clone the repository: `git clone git@github.com:sveltejs/kit.git`
- Navigate to the repository: `cd kit`

### Bootstrap and Build Commands
- **CRITICAL**: Install dependencies: `pnpm install --frozen-lockfile`
  - **NEVER CANCEL**: Takes 3-4 minutes. Set timeout to 10+ minutes.
- Sync generated files: `pnpm run sync-all` (takes <1 second)
- Build all packages: `pnpm build` (takes ~1-2 seconds)

### Development Commands
- **Format code**: `pnpm run format` (takes ~15 seconds)
- **Lint code**: `pnpm run lint` 
  - **NEVER CANCEL**: Takes 2-3 minutes. Set timeout to 5+ minutes.
- **Type checking**: `pnpm run check`
  - **NEVER CANCEL**: Takes 3-4 minutes. Set timeout to 8+ minutes.
- **Run unit tests**: `cd packages/kit && pnpm test:unit` (takes ~6 seconds)

### Testing Commands
- **Unit tests only**: `cd packages/kit && pnpm test:unit` (takes ~6 seconds)
- **Integration tests**: `pnpm test:kit`
  - **NEVER CANCEL**: Takes 10-30 minutes. Set timeout to 60+ minutes.
  - **Requires browser setup**: `pnpm playwright install chromium` first
- **Other package tests**: `pnpm test:others`
  - **NEVER CANCEL**: Takes 5-15 minutes. Set timeout to 30+ minutes.
  - **Requires browser setup**: `pnpm playwright install chromium` first

### Development Server (Playground)
- Navigate to playground: `cd playgrounds/basic`
- Start dev server: `pnpm run dev`
- Server starts at: `http://localhost:5173/`
- Dev server starts in ~1-2 seconds

## Validation Requirements

### ALWAYS run these before submitting changes:
1. `pnpm run format` - Auto-format all code
2. `pnpm run lint` - Check code style (NEVER CANCEL - takes 2-3 minutes)
3. `pnpm run check` - Type checking (NEVER CANCEL - takes 3-4 minutes)
4. `cd packages/kit && pnpm test:unit` - Run unit tests
5. **For changes to @sveltejs/kit**: `cd packages/kit && pnpm prepublishOnly` - Generate types

#### Add changeset once you're done

Run `pnpm changeset` then follow the prompts. Use this after having finished the task. Most of the time this is a patch release for `@sveltejs/kit`. Use a short and descriptive message. Always prefix the message with either `fix`, `feat`, `breaking`, or `chore` (most likely `fix` since you're mostly working on bugfixes). Example: `fix: run load functions in order`. Use the same message as the title of your pull request.

### Manual Testing Scenarios
**ALWAYS test these scenarios after making changes:**

1. **Create a new SvelteKit app**: 
   ```bash
   cd /tmp
   npx sv create test-app --template minimal --no-install --no-types
   # Press Enter to skip additional packages
   cd test-app
   
   # Use pnpm if available, otherwise fall back to npm
   if command -v pnpm &> /dev/null; then
     pnpm install
     # Link local @sveltejs/kit development version by adding pnpm overrides
     # Replace PATH_TO_KIT_REPO with the actual path to your kit repository
     npm pkg set 'pnpm.overrides.@sveltejs/kit'='link:PATH_TO_KIT_REPO/packages/kit'
     pnpm install --no-frozen-lockfile
     pnpm run dev
   else
     npm install
     # For npm, manually link the local package
     # Replace PATH_TO_KIT_REPO with the actual path to your kit repository
     npm link PATH_TO_KIT_REPO/packages/kit
     npm run dev
   fi
   ```
   - Verify the app starts and loads at http://localhost:5173/
   - Verify it's using the local @sveltejs/kit version (check that `node_modules/@sveltejs/kit` is a symlink)

2. **Test the CLI**:
   ```bash
   cd packages/kit
   node svelte-kit.js --help
   node svelte-kit.js sync --help
   ```

3. **Test playground functionality**:
   ```bash
   cd playgrounds/basic
   pnpm run dev
   ```
   - Navigate to http://localhost:5173/
   - Test basic navigation and functionality

## Repository Structure

### Key Packages (`packages/` directory):
- **@sveltejs/kit** - Main SvelteKit package (`packages/kit/`)
- **Adapters**: adapter-auto, adapter-cloudflare, adapter-netlify, adapter-node, adapter-static, adapter-vercel
- **@sveltejs/enhanced-img** - Enhanced image component
- **@sveltejs/package** - Package building utilities
- **@sveltejs/amp** - AMP support

### Key Directories:
- `packages/kit/src/core/` - Build-time code
- `packages/kit/src/runtime/` - Runtime code  
- `packages/kit/src/exports/vite/` - Vite plugin
- `packages/kit/test/` - Integration tests
- `playgrounds/basic/` - Development playground
- `.github/workflows/` - CI/CD configuration

### Important Files:
- `pnpm-workspace.yaml` - Workspace configuration
- `package.json` - Root package with scripts
- `packages/kit/svelte-kit.js` - CLI entry point
- `packages/kit/package.json` - Main package configuration

## Common Tasks

### Working with Types
- Generate types: `cd packages/kit && pnpm generate:types`
- Check types: `cd packages/kit && pnpm prepublishOnly`
- **CRITICAL**: Always commit generated type changes

### Testing Specific Changes
- Link local changes to external project using `pnpm.overrides` in external project's package.json:
  ```json
  {
    "pnpm": {
      "overrides": {
        "@sveltejs/kit": "link:../path/to/kit/packages/kit"
      }
    }
  }
  ```

### Working with Adapters
- Each adapter has its own test suite
- Build adapter: `cd packages/adapter-[name] && pnpm build`
- Test adapter: `cd packages/adapter-[name] && pnpm test`

## Timing Expectations

**Set these timeout values for long-running commands:**

| Command | Expected Time | Recommended Timeout |
|---------|---------------|-------------------|
| `pnpm install --frozen-lockfile` | 3-4 minutes | 10+ minutes |
| `pnpm run lint` | 1-2 minutes | 5+ minutes |
| `pnpm run check` | 3-4 minutes | 8+ minutes |
| `pnpm test:kit` | 10-15 minutes | 30+ minutes |
| `pnpm test:others` | 2-3 minutes | 10+ minutes |
| `pnpm run format` | ~15 seconds | 2+ minutes |
| `pnpm build` | 1-2 seconds | 2+ minutes |
| Dev server startup | 1-2 seconds | 1+ minute |
| Unit tests | ~6 seconds | 2+ minutes |

## Troubleshooting

### Browser Tests Fail
- Install Playwright browsers: `pnpm playwright install chromium`
- For full browser support: `pnpm playwright install`

### Build Failures
- Ensure all dependencies installed: `pnpm install --frozen-lockfile`
- Regenerate types: `cd packages/kit && pnpm prepublishOnly`
- Check for TypeScript errors: `pnpm run check`

### Lint/Format Issues
- Auto-fix formatting: `pnpm run format`
- Check specific package: `cd packages/[name] && pnpm lint`

### Development Server Issues
- Ensure sync is complete: `pnpm run sync-all`
- Check for port conflicts (default: 5173)
- Restart with clean cache: Clear node_modules and reinstall

## Git Hooks
Configure git hooks for automatic validation:
```bash
git config core.hookspath .githooks
```

## Output Examples

### Successful pnpm install completion:
```
Done in 2m 48.5s using pnpm v10.14.0
```

### Successful dev server startup:
```
VITE v6.3.5  ready in 1145 ms
➜  Local:   http://localhost:5173/
```

### CLI help output:
```
Usage
  $ svelte-kit <command> [options]

Available Commands
  sync    Synchronise generated type definitions
```
