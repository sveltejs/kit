<script context="module">
	/** @type {import('@sveltejs/kit').ErrorLoad} */
	export function load({ error }) {
		return {
			stuff: {
				error: error?.message,
				value: 789
			}
		};
	}
</script>
