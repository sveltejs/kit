<script>
	import { resolveRoute } from '$app/paths';
</script>

<a data-id="target" href={resolveRoute('/resolve-route/[foo]', { foo: 'resolved' })}>click me</a>
