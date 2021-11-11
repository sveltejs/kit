<script>
	import { onMount } from 'svelte';

	onMount(() => {
		document.getElementById('abcde')?.scrollIntoView();
	});
</script>

<div>They (don't) see me...</div>
<div style="background-color: peru;">
	<p id="go-to-element">The browser scrolls to me</p>
</div>
<p id="abcde">I take precedence</p>
<div />

<style>
	div {
		background-color: hotpink;
		height: 180vh;
	}
</style>
