---
title: How do I hash asset file names for caching?
---

You can have Vite process your assets by importing them as shown below:

```html
<script>
	import imageSrc from '$lib/assets/image.png';
</script>

<img src="{imageSrc}" />
```

If you prefer to directly import in the markup, try [svelte-preprocess-import-assets](https://github.com/bluwy/svelte-preprocess-import-assets) and you can write this instead:

```html
<img src="$lib/assets/image.png" />
```
