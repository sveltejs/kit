## app_template_missing

> %file% does not exist

SvelteKit renders every page using an app template, which lives at `src/app.html` by default. Create this file, or point [`files.appTemplate`](https://svelte.dev/docs/kit/configuration#files) at the template you want to use.

A minimal template looks like this:

```html
<!doctype html>
<html lang="en">
	<head>
		<meta charset="utf-8" />
		<meta name="viewport" content="width=device-width, initial-scale=1" />
		%sveltekit.head%
	</head>
	<body>
		<div style="display: contents">%sveltekit.body%</div>
	</body>
</html>
```

## app_template_tag_missing

> %file% is missing %tag%

The app template must contain both `%sveltekit.head%` and `%sveltekit.body%`. SvelteKit replaces these placeholders with the page's `<head>` content (such as links, scripts and anything added with `<svelte:head>`) and with the rendered page markup.

Put `%sveltekit.head%` inside the `<head>` element and `%sveltekit.body%` inside the `<body>` element. Using a wrapper such as `<div style="display: contents">` for `%sveltekit.body%` stops browser extensions that inject elements into `<body>` from interfering with hydration.
