---
title: Integrations
---

See [the FAQ](/faq#integrations) for detailed information about integrations.

### HTML minifier

Sapper includes `html-minifier` by default. SvelteKit does not include this, but it can be added as a [hook](/docs#hooks-handle):

```
import { minify } from 'html-minifier';
import { prerendering } from '$app/env';

const minification_options = {
	collapseBooleanAttributes: true,
	collapseWhitespace: true,
	conservativeCollapse: true,
	decodeEntities: true,
	html5: true,
	ignoreCustomComments: [/^#/],
	minifyCSS: true,
	minifyJS: false,
	removeAttributeQuotes: true,
	removeComments: true,
	removeOptionalTags: true,
	removeRedundantAttributes: true,
	removeScriptTypeAttributes: true,
	removeStyleLinkTypeAttributes: true,
	sortAttributes: true,
	sortClassName: true
};

export async function handle({ request, render }) {
  const response = await render(request);

  if (prerendering && response.headers['content-type'] === 'text/html') {
    response.body = minify(response.body, minification_options);
  }

  return response;
}
```
