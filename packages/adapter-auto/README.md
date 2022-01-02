# adapter-auto

Automatically chooses the adapter for your current environment, if possible.

## Supported environments

The following environments are supported out-of-the-box, meaning a newly created project can be deployed on one of these platforms without any additional configuration:

- [Cloudflare Pages](https://developers.cloudflare.com/pages/) via [adapter-cloudflare](../adapter-cloudflare)
- [Netlify](https://netlify.com/) via [adapter-netlify](../adapter-netlify)
- [Vercel](https://vercel.com/) via [adapter-vercel](../adapter-vercel)

## Community adapters

Support for additional environments can be added in [adapters.js](adapters.js). To avoid this package ballooning in size, community-supported adapters should not be added as dependencies — adapter-auto will instead prompt users to install missing packages as needed.

## Changelog

[The Changelog for this package is available on GitHub](https://github.com/sveltejs/kit/blob/master/packages/adapter-auto/CHANGELOG.md).
