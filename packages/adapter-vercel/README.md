# adapter-vercel

Adapter for Svelte apps that creates a Vercel app, using a function for dynamic server rendering.

## Usage

```sh
npm install --save-dev @sveltejs/adapter-vercel
# or
yarn add --dev @sveltejs/adapter-vercel
```

Then in your `svelte.config.js`:

```js
const vercel = require('@sveltejs/adapter-vercel');

module.exports = {
  kit: {
    adapter: vercel(),
    target: '#svelte',
  }
};
```
