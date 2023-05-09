---
title: AWS via SST
---

To deploy to AWS via SST, use [`svelte-kit-sst`](https://github.com/serverless-stack/sst/tree/master/packages/svelte-kit-sst).

This adapter will be installed by default when you use [`adapter-auto`](adapter-auto), but adding it to your project allows you to specify SST-specific options.

## Usage

Install with `npm i -D svelte-kit-sst`, then add the adapter to your `svelte.config.js`:

```js
// @errors: 2307 2345
/// file: svelte.config.js
import adapter from 'svelte-kit-sst';

export default {
  kit: {
    adapter: adapter()
  }
};
```

## Quickstart

1. Create a SvelteKit app
1. Run `npx create-sst`
1. It should detect that you are using Svelte and ask you to confirm.
1. Once you're ready for deployment you can run `npx sst deploy --stage=production`

### SST constructs
To use any [additional SST constructs](https://docs.sst.dev/), add them to `sst.config.ts`. 

```ts
/// file: sst.config.ts
app.stack(function Site(ctx) {
  const bucket = new Bucket(ctx.stack, "public");
  const site = new SvelteKitSite(ctx.stack, "site", {
    bind: [bucket],
  });

  ctx.stack.addOutputs({
    url: site.url,
  });
});
```

And then access them in your `+page(.server).ts` file.

```ts
/// file: +page.server.ts
import { Bucket } from "sst/node/bucket"

console.log(Bucket.public.bucketName)
```

Consult the [SST docs on Resource Binding](https://docs.sst.dev/resource-binding) to learn more

If you have any questions, you can [ask in the SST Discord](https://discord.gg/sst).