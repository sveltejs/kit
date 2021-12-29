<script>
	import { goto } from '$app/navigation';
	import { url } from '$app/stores';
</script>

<input
	id="input"
	type="text"
	value={$url.searchParams.get('foo')}
	on:input={(e) => {
		goto('?foo=' + e.currentTarget?.value, { keepfocus: true });
	}}
/>
