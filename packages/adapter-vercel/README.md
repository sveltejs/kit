# adapter-vercel

Adapter for Svelte apps that creates a Vercel app, using a function for dynamic server rendering.

This currently just builds an AWS lambda and mounts it as an API route, before writing some vercel config to serve up assets and rewrite requests to the lambda.

Experimental, and missing a lot of features and optimisations.

Due to some strong opinions of the vercel deployment mechanism:

* we currently bung the whole server into the API directory, which isn't ideal.
* we don't currently use a build task which vercel can call. This seems to make the app a static app which isn't what we want.

## Configuration

In a future edition, this will read and modify your existing `vercel.json` or write one if absent.
