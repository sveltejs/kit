<script context="module">
	export function load({ session }) {
		return { redirect: session.user ? `/profile/@${user.username}` : '/login', status: 302 };
	}
</script>
