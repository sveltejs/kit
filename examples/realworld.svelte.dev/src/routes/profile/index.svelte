<script context="module">
	export function load({ session }) {
		return {
			redirect: {
				to: session.user ? `/profile/@${session.user.username}` : '/login',
				status: 302
			}
		};
	}
</script>
