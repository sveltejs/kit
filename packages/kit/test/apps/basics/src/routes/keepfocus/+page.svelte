<script>
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
</script>

<input
	id="input"
	type="text"
	value={page.url.searchParams.get('foo')}
	on:input={(e) => {
		goto('?foo=' + e.currentTarget?.value, { keepFocus: true });
	}}
/>
