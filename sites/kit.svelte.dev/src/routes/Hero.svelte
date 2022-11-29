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
		background: rgb(211, 214, 217);
		background: radial-gradient(
				34.14% 72.25% at 47.58% 31.75%,
				rgba(232, 244, 255, 0.52) 0%,
				rgba(255, 255, 255, 0) 100%
			),
			linear-gradient(
				92.4deg,
				#d1d4d7 14.67%,
				rgba(238, 247, 255, 0.48) 54.37%,
				rgba(206, 216, 224, 0.62) 92.49%
			),
			linear-gradient(0deg, #dbe7ef, #dbe7ef);
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
		color: var(--sk-text-2);
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
			height: 70vh;
			display: flex;
			justify-content: flex-start;
			margin: 0 auto;
			padding: 0;
		}
	}
</style>
