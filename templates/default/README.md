# Default SvelteKit template

This README isn't part of the template; it is ignored, and replaced with [the shared README](../../shared/README.md) when a project is created.

The default template is automatically deployed to Cloudflare Pages and Vercel on every commit. Commits to `main` will update production deployments:

- https://cloudflare.demo.svelte.dev
- https://kit-default-template-svelte.vercel.app/

## Cloudflare Pages settings

### Build command

```
npm i -g pnpm && pnpm i && pnpm build -r
```

### Build output directory

```
/packages/create-svelte/templates/default/.svelte-kit/cloudflare
```

### Environment variables

```
NPM_FLAGS=--version
```

## Netlify settings

Most settings are contained in [netlify.toml](netlify.toml).

### Build directory

```
packages/create-svelte/templates/default
```

## Vercel settings

### Install command

```
npm install -g pnpm && pnpm install && pnpm build -r
```

### Root directory

```
packages/create-svelte/templates/default
```
