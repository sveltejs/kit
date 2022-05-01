<script context="module">
	export const load = ({ url }) => {
		return {
			props: { url }
		};
	};
</script>

<script>
	export let url;
</script>

<h1>
	{url.hash}
</h1>
