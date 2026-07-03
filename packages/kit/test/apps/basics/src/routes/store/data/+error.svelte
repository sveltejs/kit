<script>
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
</script>

<button id="reload-button" onclick={() => goto($page.url.toString())}>Reload</button>
