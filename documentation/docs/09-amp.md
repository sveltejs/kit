---
title: AMP
---

An unfortunate reality of modern web development is that it is sometimes necessary to create an [AMP](https://amp.dev/) version of your site. In SvelteKit this can be done by setting the [`amp`](/docs/configuration#amp) config option, which has the following effects:

- Client-side JavaScript, including the router, is disabled
- Styles are concatenated into `<style amp-custom>`, and the [AMP boilerplate](https://amp.dev/boilerplate/) is injected
- In development, requests are checked against the [AMP validator](https://validator.ampproject.org/) so you get early warning of any errors
