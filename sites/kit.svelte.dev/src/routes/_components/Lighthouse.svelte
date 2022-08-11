<script>
	import Lighthouse from './lighthouse3.png';
</script>

<div class="flex-container">

	<div class="flex-child text">
		<h3>Starts fast, <span style="font-weight:bold">Stays fast</span></h3>
		Server-side rendering ensures your visitors aren't left staring at loading spinners.<br/>
		Client-side navigation makes your app feel like it's 2022.
	</div>
  
	<div class="flex-child">
		<img src={Lighthouse} alt="Speedy page loads" />
	</div>

</div>

<style>
	.flex-container {
		display: flex;
		color: white;
	}

	.flex-child {
		flex: 1;
	}  

	.text {
		margin: 50px 20px 0 0;
	}

	h3 {
		margin-bottom: 0.8rem;
		color: white;
	}
</style>
