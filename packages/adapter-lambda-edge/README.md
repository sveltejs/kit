# adapter-lambda-edge

Adapter for Svelte apps that creates a ready to deploy Lambda Edge function for dynamic server rendering.

## Usage

Add `"@sveltejs/adapter-lambda-edge": "next"` to the `devDependencies` in your `package.json` and run `npm install`.

Then in your `svelte.config.js`:

```js
const lambdaEdge = require('@sveltejs/adapter-lambda-edge');

module.exports = {
	kit: {
		...
		adapter: lambdaEdge()
	}
};
```
