# adapter-ipfs

Adapter for deploying Svelte apps to IPFS - The Interplanetary File System

## Usage

```sh
npm install --save-dev @sveltejs/adapter-ipfs
```

Then in your `svelte.config.js`:

```js
module.exports = {
  ...
	adapter: '@sveltejs/adapter-ipfs'
};
```

## Configuration

When we have configuration, you can pass `node` to point to your IPFS node. Right now it is hardcoded to `http://localhost:5001`
