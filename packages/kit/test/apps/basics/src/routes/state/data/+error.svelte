<script>
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
</script>

<button id="reload-button" on:click={() => goto(page.url.toString())}>Reload</button>
