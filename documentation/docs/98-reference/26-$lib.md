---
title: $lib
---

As a convenience, SvelteKit makes imports from `src/lib` (if you didn't adjust it in your [config file](configuration#files)) available via the `$lib` alias.

```svelte
<!--- file: src/lib/Component.svelte --->
A reusable component
```

```svelte
<!--- file: src/routes/+page.svelte --->
<script>
    import Component from '$lib/Component.svelte';
</script>

<Component />
```
