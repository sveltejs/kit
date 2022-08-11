<script>
	import Lighthouse from './lighthouse3.png';
</script>

<div class="flex-container">

	<div class="flex-child text">
		<h3>Fast Initial Load<br/>Faster Navigations</h3>
	</div>
  
	<div class="flex-child">
		<img src={Lighthouse} alt="Speedy page loads" />
	</div>

</div>

<style>
	.flex-container {
		display: flex;
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
