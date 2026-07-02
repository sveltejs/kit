<script>
	import { onMount } from 'svelte';

	/** @type {string} */
	let cookies;

	onMount(() => {
		cookies = document.cookie
			.split('; ')
			.filter((c) => c.startsWith('one=') || c.startsWith('two=') || c.startsWith('three='))
			.sort()
			.join('; ');
	});
</script>

<button
	onclick={() => {
		for (const name of ['one', 'two', 'three']) {
			document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:01 GMT;`;
		}
		location.reload();
	}}
>
	Delete cookies and reload the page
</button>

<p>{cookies}</p>
