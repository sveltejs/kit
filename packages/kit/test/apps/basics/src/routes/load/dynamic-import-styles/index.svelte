<script context="module">
	export async function load() {
		return {
			props: {
				Thing: (await import('./_/Thing.svelte')).default
			}
		};
	}
</script>

<script>
	export let Thing;
</script>

<Thing />
