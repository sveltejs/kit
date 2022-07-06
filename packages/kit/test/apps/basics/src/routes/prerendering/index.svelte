<script context="module">
	export const prerender = true;

	export const load = ({ session }) => {
		return {
			props: session
		};
	};
</script>

<h1>You should never see me.</h1>
