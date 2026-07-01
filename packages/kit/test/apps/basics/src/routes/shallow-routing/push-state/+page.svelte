<script>
	import { invalidateAll, pushState } from '$app/navigation';
	import { page } from '$app/state';

	let { data } = $props();

	function one() {
		pushState('', { active: true });
	}

	function two() {
		pushState('/shallow-routing/push-state/a', { active: true });
	}
</script>

<h1>parent</h1>

<button data-id="one" onclick={one}>push state on current page</button>
<button data-id="two" onclick={two}>push state on child page</button>
<button data-id="invalidate" onclick={invalidateAll}>invalidate all</button>

<p>active: {page.state.active ?? false}</p>
<span>{data.now}</span>
