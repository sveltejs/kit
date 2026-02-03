---
title: $lib
---

SvelteKit automatically makes files under `src/lib` available using the `$lib` import alias.

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
