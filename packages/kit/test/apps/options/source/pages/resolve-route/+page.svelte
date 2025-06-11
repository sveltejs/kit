<script>
	import { resolveRoute } from '$app/paths';
	import SharedCss from '$lib/SharedCSS.svelte';
</script>

<SharedCss />
<a data-id="target" href={resolveRoute('/resolve-route/[foo]', { foo: 'resolved' })}>click me</a>
