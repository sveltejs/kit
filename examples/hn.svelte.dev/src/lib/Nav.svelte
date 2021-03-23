<script>
	export let section;
</script>

<nav>
	<img alt="Svelte Hacker News logo" class="icon" src="/favicon.png">

	<ul>
		<li><a sveltekit:prefetch href="/top/1" class:selected={section === "top"}>top</a></li>
		<li><a sveltekit:prefetch href="/new/1" class:selected={section === "new"}>new</a></li>
		<li><a sveltekit:prefetch href="/show/1" class:selected={section === "show"}>show</a></li>
		<li><a sveltekit:prefetch href="/ask/1" class:selected={section === "ask"}>ask</a></li>
		<li><a sveltekit:prefetch href="/jobs/1" class:selected={section === "jobs"}>jobs</a></li>

		<li class="about"><a sveltekit:prefetch href="/about" class:selected={section === "about"}>about</a></li>
	</ul>
</nav>

<style>
	nav {
		/* background-color: rgba(255, 102, 0, 0.05); */
		border-bottom: 1px solid #ff6600;
		color: var(--fg-light);
		font-weight: 300;
		padding: 0 1em;
	}

	.icon {
		display: block;
		width: 1em;
		height: 1em;
		float: left;
		font-size: 2em;
		position: relative;
		top: 0.4em;
		box-sizing: border-box;
		margin: 0 0.5em 0 0;
	}

	ul {
		margin: 0;
		padding: 0;
	}

	ul::after {
		content: '';
		display: block;
		clear: both;
	}

	li {
		display: block;
		float: left;
	}

	.about {
		float: right;
	}

	.selected {
		position: relative;
		display: inline-block;
		color: var(--fg);
	}

	.selected::after {
		position: absolute;
		content: '';
		width: calc(100% - 1em);
		height: 2px;
		background-color: #ff6600;
		display: block;
		bottom: 0;
	}

	a {
		color: inherit;
		text-decoration: none;
		padding: 1em 0.5em;
		display: block;
		font-weight: 500;
	}

	@media (min-width: 400px) {
		.icon {
			margin: 0 0.5em 0 0;
		}

		li {
			display: inline-block;
		}
	}
</style>