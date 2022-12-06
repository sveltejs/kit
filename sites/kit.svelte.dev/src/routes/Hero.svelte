<script>
	export let alt;
	export let title;
	export let tagline;
	export let logotype;
	export let background;
</script>

<section class="hero-banner">
	<div class="hero-container">
		<div class="hero-text">
			<img alt={title} width="400" height="50" class="logotype" src={logotype} />
			<div class="tagline">{tagline}</div>
		</div>

		<div class="hero-image">
			<picture sizes="(min-width: 480px) 800px, (min-width: 1024px) 480px, 600px">
				{#each Object.entries(background.sources) as [format, images]}
					<source
						srcset={images.map((i) => `${i.src} ${i.w}w`).join(', ')}
						type={'image/' + format}
					/>
				{/each}
				<img src={background.fallback.src} {alt} />
			</picture>
		</div>
	</div>
</section>

<style>
	.hero-banner {
		max-width: 100vw;
		background: hsl(210, 7%, 84%);
		background: radial-gradient(
				34.14% 72.25% at 47.58% 31.75%,
				hsla(209, 100%, 95%, 0.52) 0%,
				hsla(0, 0%, 100%, 0) 100%
			),
			linear-gradient(
				92.4deg,
				hsl(210, 7%, 83%) 14.67%,
				hsla(208, 100%, 97%, 0.48) 54.37%,
				hsla(207, 22%, 84%, 0.62) 92.49%
			),
			linear-gradient(0deg, hsl(204, 38%, 90%), hsl(204, 38%, 90%));
		position: relative;
		padding: 8rem var(--sk-page-padding-side) 0;
		display: flex;
		justify-content: flex-start;
		align-items: center;
		overflow: hidden;
	}

	.hero-container {
		width: 100%;
		max-width: 90rem;
		margin: 0 auto;
		/* display: flex; */
		justify-content: center;
	}

	.hero-text {
		display: flex;
		flex-direction: column;
		justify-content: center;
		align-items: center;
		mix-blend-mode: multiply;
	}

	.hero-banner .tagline {
		margin-top: 0;
		position: relative;
		font-size: 2rem;
		font-weight: 200;
		line-height: 1.2;
		letter-spacing: 0.1em;
		text-align: center;
		text-transform: uppercase;
		color: var(--sk-text);
		max-width: 12em;
		font-family: var(--sk-font);
	}

	.logotype {
		position: relative;
		width: 100%;
		max-width: 400px;
		margin: 0 0 2rem 0;
	}

	.hero-image {
		display: flex;
		flex: 1;
		justify-content: center;
		align-items: center;
	}

	.hero-image img {
		width: 600px;
		height: 450px;
		object-fit: cover;
		transform: translate(-2%, -10%);
	}

	@media (min-width: 480px) {
		.hero-banner .tagline {
			max-width: auto;
		}

		.hero-image img {
			width: 800px;
			height: 600px;
		}
	}

	@media (min-width: 1024px) {
		.hero-banner {
			padding: 0 var(--sk-page-padding-side);
		}

		.hero-text {
			margin-top: -10rem;
			align-items: flex-end;
			flex: 1;
		}

		.hero-image {
			flex: 1.2;
		}

		.hero-image img {
			width: 480px;
			object-fit: contain;
			transform: scale(1.8);
		}

		.hero-banner .tagline {
			text-align: right;
			max-width: 12em;
		}

		.hero-container {
			height: 55vh;
			display: flex;
			justify-content: flex-start;
			margin: 0 auto;
			padding: 0;
		}
	}

	@media (prefers-color-scheme: dark) {
		.hero-banner {
			background: hsl(210, 7%, 20%);
			background: radial-gradient(
					64.14% 72.25% at 47.58% 31.75%,
					hsla(209, 100%, 75%, 0.52) 0%,
					hsla(0, 0%, 100%, 0) 100%
				),
				linear-gradient(
					92.4deg,
					hsl(210, 7%, 16%) 14.67%,
					hsla(208, 100%, 23%, 0.48) 54.37%,
					hsla(207, 22%, 13%, 0.62) 92.49%
				),
				linear-gradient(0deg, hsl(204, 38%, 20%), hsl(204, 10%, 90%));
		}

		.hero-text {
			mix-blend-mode: screen;
		}
	}
</style>
