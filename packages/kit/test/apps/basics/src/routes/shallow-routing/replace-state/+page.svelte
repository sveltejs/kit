<script>
	import { goto } from '$app/navigation';
	import { page } from '$app/state';

	async function one() {
		await goto(null, { replace: true, state: { active: true } });
	}

	async function two() {
		await goto('/shallow-routing/replace-state/a', {
			replace: true,
			shallow: true,
			state: { active: true }
		});
	}
</script>

<h1>parent</h1>

<button data-id="one" onclick={one}>replace state on current page</button>
<button data-id="two" onclick={two}>shallow navigate and replace</button>
<button
	data-id="end-shallow"
	onclick={() => goto('/shallow-routing/replace-state', { replace: true, state: { active: true } })}
	>end shallow</button
>
<button
	data-id="state-only"
	onclick={() => goto(null, { replace: true, state: { active: true }, persistState: true })}
	>persist state only</button
>

<p>active: {page.state.active ?? false}</p>
<span data-id="shallow">{page.shallow ? page.shallow.url.pathname : 'null'}</span>
