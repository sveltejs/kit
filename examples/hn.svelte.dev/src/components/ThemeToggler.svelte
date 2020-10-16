<script>
	// preserve the focus ring for keyboard users because a11y,
	// but hide for mouse users because fugly
	let nice = false;

	let theme = 'light';

	try {
		theme = localStorage.theme;
	} catch (e) {
		// ignore — could be SSR, or e.g. Firefox with restrictive permissions
	}

	const toggle = () => {
		const { classList } = document.querySelector('html');
		classList.remove(theme);
		theme = theme === 'light' ? 'dark' : 'light';
		classList.add(theme);

		try {
			localStorage.theme = theme;
		} catch (e) {
			// ignore
		}
	};
</script>

<button
	aria-label="Toggle theme"
	title="Toggle theme"
	class:nice
	on:mousedown="{() => nice = true}"
	on:blur="{() => nice = false}"
	on:click={toggle}
>
	toggle theme

	<svg viewBox="0 0 24 24">
		<path class="light" d="M12,18A6,6 0 0,1 6,12A6,6 0 0,1 12,6A6,6 0 0,1 18,12A6,6 0 0,1 12,18M20,15.31L23.31,12L20,8.69V4H15.31L12,0.69L8.69,4H4V8.69L0.69,12L4,15.31V20H8.69L12,23.31L15.31,20H20V15.31Z" />
		<path class="dark" d="M12,18C11.11,18 10.26,17.8 9.5,17.45C11.56,16.5 13,14.42 13,12C13,9.58 11.56,7.5 9.5,6.55C10.26,6.2 11.11,6 12,6A6,6 0 0,1 18,12A6,6 0 0,1 12,18M20,8.69V4H15.31L12,0.69L8.69,4H4V8.69L0.69,12L4,15.31V20H8.69L12,23.31L15.31,20H20V15.31L23.31,12L20,8.69Z" />
	</svg>
</button>

<style>
	button {
		position: fixed;
		right: 1em;
		bottom: 1em;
		width: 2em;
		height: 2em;
		text-indent: -9999px;
		background-color: transparent;
		border: none;
		opacity: 0.4;
	}

	.nice {
		outline: none;
	}

	svg {
		position: absolute;
		width: 100%;
		height: 100%;
		right: 0;
		bottom: 0;
	}

	path {
		fill: var(--fg);
		transition: opacity 0.6s;
	}

	.dark {
		opacity: 0;
	}

	:global(html).dark .dark {
		opacity: 1;
	}
</style>