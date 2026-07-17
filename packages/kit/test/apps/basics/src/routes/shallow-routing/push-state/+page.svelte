<script>
	import { goto, refreshAll, pushState } from '$app/navigation';
	import { page } from '$app/state';

	let { data } = $props();
	/** @type {string | null} */
	let resolved = $state(null);

	function one() {
		void pushState('', { active: true });
	}

	function two() {
		void pushState('/shallow-routing/push-state/a', { active: true });
	}

	async function params() {
		await pushState('/shallow-routing/push-state/hello', { active: true });
		resolved = document.querySelector('p')?.textContent ?? null;
	}
</script>

<h1>parent</h1>

<button data-id="one" onclick={one}>push state on current page</button>
<button data-id="two" onclick={two}>push state on child page</button>
<button data-id="params" onclick={params}>push state on parameterized page</button>
<button data-id="cancel" onclick={() => pushState('?cancel', { active: true })}>cancel</button>
<button data-id="state-only" onclick={() => pushState('', { active: true })}>state only</button>
<button data-id="end-shallow" onclick={() => pushState(null, { active: true })}>end shallow</button>
<button
	data-id="state-only-persist"
	onclick={() => pushState('', { active: true }, { persist: true })}>persist state</button
>
<button
	data-id="shallow-persist"
	onclick={() => pushState('/shallow-routing/push-state/a', { active: true }, { persist: true })}
	>persist shallow state</button
>
<button
	data-id="goto-state"
	onclick={() => goto('/shallow-routing/push-state', { state: { active: true } })}
	>goto with state</button
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
