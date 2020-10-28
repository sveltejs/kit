# adapter-vercel

Adapter for Svelte apps that creates a Vercel app, using a function for dynamic server rendering.

This currently just builds an AWS lambda and mounts it as an API route, before writing some vercel config to serve up assets and rewrite requests to the lambda.

Due to some strong opinions of the vercel deployment mechanism, we currently bung the whole server into the API directory to prevent the application appearing to be static, which isn't ideal.

Vercel are due to make some changes to the way applications are built and deployed. Once this happens, this builder will change to that new format.

## Usage

Due to the constraints listed above, you need to run `npm run build` outside vercel first, and then deploy the project with `vercel`.
You need to ensure that `vercel` doesn't try to build your app, and just deploys what you give it. To do that:

```sh
echo 'package.json' > .vercelignore
npm run build
vercel
```