<script>
	import { page } from '$app/state';
	import { pushState } from '$app/navigation';
	import Other from './Other.svelte';

	function showOther() {
		pushState('/shallow-routing/preload-push', { showOther: true });
	}
</script>

{#if page.state.showOther}
	<Other />
{:else}
	<p id="initial">Initial page</p>
	<button id="show-other" onclick={showOther}>Show Other</button>
{/if}
