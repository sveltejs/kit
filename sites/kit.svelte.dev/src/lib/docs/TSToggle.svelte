<script>
	import Checkbox from './Checkbox.svelte';

	let checked = prefers_ts();
	$: toggle(checked);

	function toggle(checked) {
		try {
			localStorage.setItem('prefers-ts', checked);
			if (checked) {
				document.documentElement.classList.add('prefers-ts');
			} else {
				document.documentElement.classList.remove('prefers-ts');
			}
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
		height: 42px;
		z-index: 2;
		padding: 0 3.2rem;
	}
</style>
