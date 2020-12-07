# adapter-vercel

Adapter for Svelte apps that creates a Vercel app, using a function for dynamic server rendering.

## Usage

```sh
npm install --save-dev @sveltejs/adapter-vercel
```

Then in your `svelte.config.js`:

```js
module.exports = {
  ...
	adapter: '@sveltejs/adapter-vercel'
};
```