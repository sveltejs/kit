<script context="module">
	export const load = ({ session }) => {
		return {
			props: session
		};
	};
</script>

<h1>I should never be prerendered.</h1>
