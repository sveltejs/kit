<script context="module">
	export function load({ session }) {
		return {
			redirect: {
				to: session.user ? `/profile/@${user.username}` : '/login',
				status: 302
			}
		};
	}
</script>
