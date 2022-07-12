<script context="module">
	export const load = ({ error, status }) => {
		return {
			props: {
				title: `${status}: ${error.message}`
			}
		};
	};
</script>

<script>
	export let title = 'Unknown error!';
</script>

<h1>{title}</h1>
