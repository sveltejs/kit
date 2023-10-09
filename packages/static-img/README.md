# `@sveltejs/static-img`

**WARNING**: This package is experimental. It uses pre-1.0 versioning and may introduce breaking changes with every minor version release.

This package aims to bring a plug and play image component to SvelteKit that is opinionated enough so you don't have to worry about the details, yet flexible enough for more advanced use cases or tweaks. It serves a smaller file format like `avif` or `webp`.

## Setup

Install:

```bash
npm install --save @sveltejs/static-img
```

Adjust `vite.config.js`:

```diff
import { sveltekit } from '@sveltejs/kit/vite';
+import { images } from '@sveltejs/static-img';
import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [
+		images(),
		sveltekit()
	]
});
```

## Usage

Static build time optimization uses `vite-imagetools`, which comes as an optional peer dependency, so you first need to install it:

```bash
npm install --save-dev vite-imagetools
```

Use in your `.svelte` components by referencing a relative path beginning with `./` or `$` (for Vite aliases):

```svelte
<img src="./path/to/your/image.jpg" alt="An alt text" />
```

This optimizes the image at build time using `vite-imagetools`. `width` and `height` are optional as they can be inferred from the source image.

You can also manually import an image and then pass it to a transformed `img` tag.

```svelte
<script>
	import { MyImage } from './path/to/your/image.jpg';
</script>

<!-- svelte-image-enable -->
<img src={MyImage} alt="An alt text" />
```

This is useful when you have a collection of static images and would like to dynamically choose one. A collection of images can be imported with [Vite's `import.meta.glob`](https://vitejs.dev/guide/features.html#glob-import).

> If you have existing image imports like `import SomeImage from './some/image.jpg';` they will be treated differently now. If you want to get back the previous behavior of this import returning a URL string, add `?url` to the end of the import.

Note that the generated code is a `picture` tag wrapping one `source` tag per image type.

If you have an image tag you do not want to be transformed you can use the comment `<!-- svelte-image-disable -->`.

### Static vs dynamic image references

This package only handles images that are located in your project and can be referred to with a static string. It generates images at build time, so building may take longer the more images you transform.

Alternatively, using an image CDN provides more flexibility with regards to sizes and you can pass image sources not known at build time, but it comes with potentially a bit of setup overhead (configuring the image CDN) and possibly usage cost. CDNs reduce latency by distributing copies of static assets globally. Building HTML to target CDNs may result in slightly smaller HTML because they can serve the appropriate file format for an `img` tag based on the `User-Agent` header whereas build-time optimizations must produce `picture` tags. Finally some CDNs may generate images lazily, which could have a negative performance impact for sites with low traffic and frequently changing images.

You can mix and match both solutions in one project, but can only use this library for static image references.

## Best practices

- Always provide a good `alt` text
- Your original images should have a good quality/resolution. Images will only be sized down
- Choose one image per page which is the most important/largest one and give it `priority` so it loads faster. This gives you better web vitals scores (largest contentful paint in particular)
- Give the image a container or a styling so that it is constrained and does not jump around. `width` and `height` help the browser reserving space while the image is still loading

## Roadmap

This is an experimental MVP for getting initial feedback on the implementation/usability of an image component usable with SvelteKit (can also be used with Vite only). Once the API is stable, we may enable in SvelteKit or the templates by default.

## Acknowledgements

We'd like to thank the authors of the Next/Nuxt/Astro/`unpic` image components and `svelte-preprocess-import-assets` for inspiring this work. We'd also like to thank the authors of `vite-imagetools` which is used in `@sveltejs/static-img`.
