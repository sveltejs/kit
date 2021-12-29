<script>
	import { goto } from '$app/navigation';
	import { route } from '$app/stores';
</script>

<input
	id="input"
	type="text"
	value={$route.url.searchParams.get('foo')}
	on:input={(e) => {
		goto('?foo=' + e.currentTarget?.value, { keepfocus: true });
	}}
/>
