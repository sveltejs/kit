---
title: Asset handling
---

## Caching and inlining

[Vite will automatically process imported assets](https://vitejs.dev/guide/assets.html) for improved performance. Hashes will be added to the filenames so that they can be cached and assets smaller than `assetsInlineLimit` will be inlined.

```html
<script>
	import logo from '$lib/assets/logo.png';
</script>

<img alt="The project logo" src={logo} />
```

If you prefer to reference assets directly in the markup, you can use a preprocessor such as [svelte-preprocess-import-assets](https://github.com/bluwy/svelte-preprocess-import-assets).

For assets included via the CSS `url()` function, you may find [`vitePreprocess`](https://kit.svelte.dev/docs/integrations#preprocessors-vitepreprocess) useful.

## Transforming

You may wish to transform your images to output compressed image formats such as `.webp` or `.avif`, responsive images with different sizes for different devices, or images with the EXIF data stripped for privacy. For images that are included statically, you may use a Vite plugin such as [vite-imagetools](https://github.com/JonasKruckenberg/imagetools). You may also consider a CDN, which can serve the appropriate transformed image based on the `Accept` HTTP header and query string parameters.
