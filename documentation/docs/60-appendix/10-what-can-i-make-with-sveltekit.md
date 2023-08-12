---
title: What can I make with SvelteKit?
---

SvelteKit can be used to create most kinds of applications. Out of the box, SvelteKit supports many features including:

- Dynamic page content with [load](/docs/load) functions and [API routes](/docs/routing#server).
- SEO-friendly dynamic content with [server-side rendering (SSR)](/docs/glossary#ssr).
- User-friendly progressively-enhanced interactive pages with SSR and [Form Actions](/docs/form-actions).
- Static pages with [prerendering](/docs/page-options#prerender).

SvelteKit can also be deployed to a wide spectrum of hosted architectures via [adapters](/docs/adapters). In cases where SSR is used (or server-side logic is added without prerendering), those functions will be adapted to the target backend. Some examples include:

- Self-hosted dynamic web applications with a [Node.js backend](/docs/adapter-node).
- Serverless web applications with backend loaders and APIs deployed as remote functions. See [zero-config deployments](/docs/adapter-auto) for popular deployment options.
- [Static pre-rendered sites](/docs/adapter-static) such as a blog or multi-page site hosted on a CDN or static host. Statically-generated sites are shipped without a backend.
- [Single-page Applications (SPAs)](/docs/single-page-apps) with client-side routing and rendering for API-driven dynamic content. SPAs are shipped without a backend and are not server-rendered. This option is commonly chosen when bundling SvelteKit with an app written in PHP, .Net, Java, C, Golang, Rust, etc.
- A mix of the above; some routes can be static, and some routes can use backend functions to fetch dynamic information. This can be configured with [page options](/docs/page-options) that includes the option to opt out of SSR.

In order to support SSR, a JS backend — such as Node.js or Deno-based server, serverless function, or edge function — is required.

It is also possible to write custom adapters or leverage community adapters to deploy SvelteKit to more platforms such as specialized server environments, browser extensions, or native applications. See [How do I use X with SvelteKit](/docs/integrations) for more examples and integrations.
