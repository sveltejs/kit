<script>
	import { pushState } from '$app/navigation';
	import { page } from '$app/state';

	function handleClick() {
		pushState('', { active: true });
	}
</script>

<a id="subpage-link" href="/scroll/push-state/a">Subpage</a>

{#each { length: 20 } as _, n}
	<p>#{n}</p>
{/each}

<button id="shallow-button" type="button" on:click={handleClick}>Shallow</button>

{#if page.state.active}
	<button id="back-button" type="button" on:click={() => history.back()}>Back</button>
{/if}
