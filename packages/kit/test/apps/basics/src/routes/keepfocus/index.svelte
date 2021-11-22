<script>
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
</script>

<input
	id="input"
	type="text"
	value={$page.query.get('foo')}
	on:input={(e) => {
		goto('?foo=' + e.currentTarget?.value, { keepfocus: true });
	}}
/>
