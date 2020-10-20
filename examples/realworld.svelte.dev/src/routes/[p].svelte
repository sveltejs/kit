<script context="module">
	export function preload({ params }) {
		return {
			p: +params.p
		};
	}
</script>

<script>
	import Home from '$components/Home.svelte';
	export let p;
</script>

<Home {p}/>