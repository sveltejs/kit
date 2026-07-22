<script>
	import { goto, refreshAll } from '$app/navigation';
	import { page } from '$app/state';

	let { data } = $props();
	/** @type {string | null} */
	let resolved = $state(null);

	function one() {
		void goto('', { shallow: true, state: { active: true } });
	}

	function two() {
		void goto('/shallow-routing/push-state/a', {
			state: { active: true },
			shallow: true
		});
	}

	async function params() {
		await goto('/shallow-routing/push-state/hello', {
			state: { active: true },
			shallow: true
		});
		resolved = document.querySelector('p')?.textContent ?? null;
	}
</script>

<h1>parent</h1>

<button data-id="one" onclick={one}>add state on current page</button>
<button data-id="two" onclick={two}>shallow navigate to child page</button>
<button data-id="params" onclick={params}>shallow navigate to parameterized page</button>
<button data-id="cancel" onclick={() => goto('?cancel', { shallow: true, state: { active: true } })}
	>cancel</button
>
<button data-id="state-only" onclick={() => goto('', { shallow: true, state: { active: true } })}
	>state only</button
>
<button
	data-id="state-only-persist"
	onclick={() => goto('', { shallow: true, state: { active: true }, persistState: true })}
	>persist state only</button
>
<button
	data-id="shallow-persist"
	onclick={() =>
		goto('/shallow-routing/push-state/a', {
			shallow: true,
			state: { active: true },
			persistState: true
		})}>persist shallow state</button
>
<button
	data-id="goto-state"
	onclick={() => goto('/shallow-routing/push-state', { state: { active: true } })}
	>goto with state</button
>
<button
	data-id="goto-persist"
	onclick={() =>
		goto('/shallow-routing/push-state', { state: { active: true }, persistState: true })}
	>persist goto state</button
>
<button
	data-id="end-shallow"
	onclick={() => goto('/shallow-routing/push-state', { state: { active: true } })}
	>end shallow</button
>
<button data-id="refresh" onclick={refreshAll}>refresh all</button>

<p>active: {page.state.active ?? false}</p>
<span data-id="shallow">
	{page.shallow
		? `${page.shallow.url.pathname} ${page.shallow.route?.id ?? 'null'} ${JSON.stringify(page.shallow.params)}`
		: 'null'}
</span>
<span data-id="resolved">{resolved}</span>
<span data-id="now">{data.now}</span>
