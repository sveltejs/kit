<script>
	import Lighthouse from './lighthouse.png';
</script>

<div class="container">

	<div class="text">
		<h3>Starts fast, <span style="font-weight:bold">Stays fast</span></h3>
		Server-side rendering ensures your visitors aren't left staring at loading spinners.<br/>
		Client-side navigation makes your app feel like it's 2022.
	</div>

	<div class="image">
		<img src={Lighthouse} alt="Speedy page loads" />
	</div>

</div>

<style>
	.container {
		display: grid;
		grid-template-columns: repeat(1, minmax(0, 1fr));
		gap: 50px;
		color: white;
	}

	.text {
		margin-top: 0;
	}

	h3 {
		margin-bottom: 0.8rem;
		color: white;
	}

	.image {
		grid-column: span 2 / span 2;
	}

	img {
		width: 100%;
		max-width: 670px;
		height: auto;
	}

	@media (min-width: 1024px) {
		.container {
			grid-template-columns: repeat(3, minmax(0, 1fr));
		}
	}

	@media (min-width: 1280px) {
		.text {
			margin-top: 50px;
		}
	}
</style>
