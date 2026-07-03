<script>
	import { replaceState } from '$app/navigation';
	import { page } from '$app/state';

	function one() {
		replaceState('', { active: true });
	}

	function two() {
		replaceState('/shallow-routing/replace-state/a', { active: true });
	}
</script>

<h1>parent</h1>

<button data-id="one" onclick={one}>replace state on current page</button>
<button data-id="two" onclick={two}>replace state on child page</button>

<p>active: {page.state.active ?? false}</p>
