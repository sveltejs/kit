<script context="module">
	export function load({ params }) {
		return { props: params };
	}
</script>

<script>
	export let one;
	export let two;
</script>

<h1>{one}/{two}</h1>

<a href="../y/1" id="goto-y1">next</a>
