<script context="module">
	export function load() {
		return { props: { escape: '$&' } };
	}
</script>

<script>
	/** @type {string} */
	export let escape;
</script>

$& {escape}
