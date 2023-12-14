<script>
	import { pushState } from '$app/navigation';
	import { page } from '$app/stores';

	function one() {
		pushState('', { active: true });
	}

	function two() {
		pushState('/shallow-routing/push-state/a', { active: true });
	}
</script>

<h1>parent</h1>

<button data-id="one" on:click={one}>push state on current page</button>
<button data-id="two" on:click={two}>push state on child page</button>

<p>active: {$page.state.active ?? false}</p>
