<script context="module">
	export const load = ({ url }) => {
		let hash = url.hash;

		return {
			props: { hash }
		};
	};
</script>

<script>
	export let hash;
</script>

<p id="hash">
	{hash}
</p>
