<script context="module">
	export async function load() {
		return {
			status: 303,
			redirect: '/redirect-on-load/redirected'
		};
	}
</script>

<h1>Woops!</h1>
<p>You shouldn't be here. You should have been directed to /redirect!</p>
