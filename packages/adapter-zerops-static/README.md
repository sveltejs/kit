# adapter-zerops-static

[Adapter](https://kit.svelte.dev/docs/adapters) for SvelteKit apps that generates a static site for deployment on [Zerops](https://zerops.io).

## Usage

Install with npm:

```bash
npm install --save-dev @sveltejs/adapter-zerops-static
```

Then in your `svelte.config.js`:

```js
import adapter from '@sveltejs/adapter-zerops-static';

export default {
	kit: {
		adapter: adapter()
	}
};
```

## How it works

The adapter will:

1. Generate a static version of your SvelteKit app
2. Create a `zerops.yml` configuration file for static hosting

The generated `zerops.yml` will look like:

```yaml
zerops:
  - setup: app
    build:
      base: nodejs@20
      buildCommands:
        - pnpm i
        - pnpm build
      deployFiles:
        - build/~
    run:
      base: static
```

## Options

The adapter accepts the following options:

| Option | Type | Default | Description |
| --- | --- | --- | --- |
| `config` | `string` | `zerops.yml` | Path to zerops.yml configuration file |

## Static Site Requirements

- Your app must be able to be prerendered/exported to static files
- Any dynamic routes must be prerenderable
- API routes and server-side functionality are not supported

## Deployment

After building, commit and push your code. Zerops will automatically detect the configuration and deploy your static site.

## Changelog

[The Changelog for this package is available on GitHub](https://github.com/sveltejs/kit/blob/main/packages/adapter-zerops-static/CHANGELOG.md). 