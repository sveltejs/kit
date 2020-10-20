<script context="module">
	export function preload({ params }, { user }) {
		if (user) {
			this.redirect(302, `/profile/@${user.username}`);
		} else {
			this.redirect(302, `/login`);
		}
	}
</script>
