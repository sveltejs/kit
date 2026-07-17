<script>
	import { replaceState } from '$app/navigation';
	import { page } from '$app/state';

	async function one() {
		await replaceState('', { active: true });
	}

	async function two() {
		await replaceState('/shallow-routing/replace-state/a', { active: true });
	}
</script>

<h1>parent</h1>

<button data-id="one" onclick={one}>replace state on current page</button>
<button data-id="two" onclick={two}>replace state on child page</button>
<button data-id="end-shallow" onclick={() => replaceState(null, { active: true })}
	>end shallow</button
>
<button data-id="state-only" onclick={() => replaceState('', { active: true }, { persist: true })}
	>persist state</button
>

<p>active: {page.state.active ?? false}</p>
<span data-id="shallow">{page.shallow ? page.shallow.url.pathname : 'null'}</span>
