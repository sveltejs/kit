<script>
	import Checkbox from './Checkbox.svelte';

	let checked = prefers_ts();
	$: toggle(checked);

	function toggle(checked) {
		try {
			document.documentElement.classList.toggle('prefers-ts', checked);
			localStorage.setItem('prefers-ts', checked);
		} catch (e) {
			// localStorage not available or we are on the server
		}
	}

	function prefers_ts() {
		try {
			return localStorage.getItem('prefers-ts') === 'true' ? true : false;
		} catch (e) {
			return false;
		}
	}
</script>

<!-- svelte-ignore a11y-label-has-associated-control -->
<label class="input-output-toggle">
	JavaScript <Checkbox bind:checked /> TypeScript
</label>

<style>
	.input-output-toggle {
		position: relative;
		display: flex;
		gap: 0.5em;
		user-select: none;
		align-items: center;
		width: 100%;
		height: var(--ts-toggle-height);
		z-index: 2;
		padding: 0 var(--sk-page-padding-side);
		margin: 0 auto;
	}

	@media (min-width: 832px) {
		.input-output-toggle {
			padding-left: 3.2rem;
			width: var(--sidebar-menu-width);
			margin: 0 0 0 auto;
		}
	}
</style>
