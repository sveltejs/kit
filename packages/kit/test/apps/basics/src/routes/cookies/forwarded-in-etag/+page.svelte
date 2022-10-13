<script>
	import { onMount } from 'svelte';

	let cookies;

	onMount(() => {
		cookies = document.cookie;
	});
</script>

<button
	on:click={() => {
		document.cookie = 'foo=bar;expires=Thu, 01 Jan 1970 00:00:01 GMT;';
		location.reload();
	}}
>
	Delete cookies and reload the page
</button>

<p>{cookies}</p>
