---
title: Images
---

## Caching and inlining

[Vite will automatically process imported assets](https://vitejs.dev/guide/assets.html) for improved performance. Hashes will be added to the filenames so that they can be cached and assets smaller than `assetsInlineLimit` will be inlined.

```html
<script>
	import logo from '$lib/assets/logo.png';
</script>

<img alt="The project logo" src={logo} />
```

To reference assets directly in the markup, you can use a preprocessor such as [`@sveltejs/static-img`](#static-image-transforms), which also transforms images, or [svelte-preprocess-import-assets](https://github.com/bluwy/svelte-preprocess-import-assets) which simply creates the import for you without other changes.

For assets included via the CSS `url()` function, you may find [`vitePreprocess`](https://kit.svelte.dev/docs/integrations#preprocessors-vitepreprocess) useful.

## Transforming background

You may wish to transform your images to output compressed image formats such as `.webp` or `.avif`, responsive images with different sizes for different devices, or images with the EXIF data stripped for privacy.

The `@sveltejs/static-img` package only handles images that are located in your project and can be referred to with a static string. It generates images at build time, so building may take longer the more images you transform. These images may be served via CDN so that they are served with low latency to users.

Alternatively, using an CDN to do the image transformation provides more flexibility with regards to sizes and you can pass image sources not known at build time, but it comes with potentially a bit of setup overhead (configuring the image CDN) and possibly usage cost. CDNs reduce latency by distributing copies of static assets globally. Building HTML to target CDNs may result in slightly smaller HTML because they can serve the appropriate file format for an `img` tag based on the `User-Agent` header whereas build-time optimizations must produce `picture` tags. Finally some CDNs may generate images lazily, which could have a negative performance impact for sites with low traffic and frequently changing images. SvelteKit does not currently offer any tools for dynamic image transforms since they're easier for users to implement, but we may offer such utilities in the future.

You can mix and match both solutions in one project. For example, you may display images on your homepage with `@sveltejs/static-img` and display user-submitted content with a dynamic approach.

## Static image transforms

> **WARNING**: The `@sveltejs/static-img` package is experimental. It uses pre-1.0 versioning and may introduce breaking changes with every minor version release.

`@sveltejs/static-img` aims to bring plug and play image processing to SvelteKit that is opinionated enough so you don't have to worry about the details, yet flexible enough for more advanced use cases or tweaks. It serves smaller file formats like `avif` or `webp` and automatically adds the intrinsic width and height of the image to avoid layout shift.

### Setup

Install:

```bash
npm install --save @sveltejs/static-img
```

Adjust `vite.config.js`:

```diff
import { sveltekit } from '@sveltejs/kit/vite';
+import { staticImages } from '@sveltejs/static-img';
import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [
+		staticImages(),
		sveltekit()
	]
});
```

### Basic usage

Use in your `.svelte` components by referencing a relative path beginning with `./` or `$` (for Vite aliases):

```svelte
<img src="./path/to/your/image.jpg" alt="An alt text" />
```

This will replace your `img` tag with a `picture` tag wrapping one `source` tag per image type.

### Dynamically choosing an image

You can also manually import an image and then pass it to a transformed `img` tag.

```svelte
<script>
	import { MyImage } from './path/to/your/image.jpg';
</script>

<!-- static-img-enable -->
<img src={MyImage} alt="An alt text" />
```

This is useful when you have a collection of static images and would like to dynamically choose one. A collection of images can be imported with [Vite's `import.meta.glob`](https://vitejs.dev/guide/features.html#glob-import).

### Intrinsic Dimensions

`width` and `height` are optional as they can be inferred from the source image and will be automatically added when the `<img>` tag is preprocessed. These attributes are added because the browser can reserve the correct amount of space when it knows image dimensions which prevents layout shift. If you'd like to use a different `width` and `height` you can style the image with CSS. Because the preprocessor adds a `width` and `height` for you, if you'd like one of the dimensions to be automatically calculated then you will need to specify that:

```
<style>
	.hero-image img {
		width: var(--size);
		height: auto;
	}
</style>
```

### Skipping an image

> If you have existing image imports like `import SomeImage from './some/image.jpg';` they will be treated differently now. If you want to get back the previous behavior of this import returning a URL string, add `?url` to the end of the import.

If you have an image tag you do not want to be transformed you can use the comment `<!-- static-img-disable -->`.

## Best practices

- Always provide a good `alt` text
- Choose one image per page which is the most important/largest one and give it `priority` so it loads faster. This gives you better web vitals scores (largest contentful paint in particular)
- Your original images should have a good quality/resolution. Impage processing can size images down to save bandwidth when serving smaller screens, but cannot invent pixels to size images up any better than browsers can
- Give the image a container or a styling so that it is constrained and does not jump around. `width` and `height` help the browser reserving space while the image is still loading. `@sveltejs/static-img` will add a `width` and `height` for you
