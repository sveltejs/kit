---
question: How do I hash asset file names for caching?
---

You can have Vite process your assets by importing them as shown below:

```html
<script>
	import imageSrc from '$lib/assets/image.png';
</script>

<img src="{imageSrc}" />
```

There is an [open request in `vite-plugin-svelte` to help do this automatically](https://github.com/sveltejs/vite-plugin-svelte/issues/114).
