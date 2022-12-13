<script>
	// mimic nav behaviour
	let last_scroll = 0;
	let visible = true;

	function handle_scroll() {
		const scroll = window.pageYOffset;
		visible = scroll < 50 || scroll < last_scroll;

		last_scroll = scroll;
	}
</script>

<svelte:window on:scroll={handle_scroll} />

<header class="banner" class:visible>
	<p>
		<a href="https://www.youtube.com/watch?v=N4BRVkQVoMc">
			<strong>Dec 14:</strong> a Svelte Radio live special 👀
		</a>
	</p>
</header>

<style>
	.banner {
		position: fixed;
		top: 0;
		left: 0;
		width: 100%;
		height: 4rem;
		display: flex;
		background: var(--sk-theme-1);
		color: white;
		z-index: 999;
		transition: transform 0.2s;
	}

	.banner p {
		flex: 1;
		text-align: center;
		margin: 1rem;
	}

	.banner a {
		color: inherit;
	}

	@media (max-width: 800px) {
		.banner:not(.visible) {
			transform: translate(0, calc(-100% - 1rem));
		}
	}
</style>
