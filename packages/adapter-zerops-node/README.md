# adapter-zerops-node

[Adapter](https://kit.svelte.dev/docs/adapters) for SvelteKit apps that creates a Node.js server for deployment on [Zerops](https://zerops.io).

## Usage

Install with npm:

```bash
npm install --save-dev @sveltejs/adapter-zerops-node
```

Then add the adapter to your `svelte.config.js`:

```js
import adapter from '@sveltejs/adapter-zerops-node';

export default {
	kit: {
		adapter: adapter()
	}
};
```

## Options

The adapter accepts the following options:

| Option   | Type     | Default     | Description                           |
|----------|----------|-------------|---------------------------------------|
| `config` | `string` | zerops.yml  | Path to zerops.yml configuration file |

## Node.js Deployment

This adapter creates a Node.js application that can be deployed to Zerops. It will:

1. Bundle your SvelteKit app into a Node.js application
2. Create a `zerops.yml` configuration file
3. Configure the app to run on Zerops with Node.js 18

The generated `zerops.yml` will configure:
- A Node.js 18 service
- HTTP port 3000
- Required environment variables

## Environment Variables

The following environment variables can be configured:

- `PORT`: The port the server will listen on (defaults to 3000)

## Changelog

[The Changelog for this package is available on GitHub](https://github.com/sveltejs/kit/blob/main/packages/adapter-zerops-node/CHANGELOG.md). 