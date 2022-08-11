<script>
	import Lighthouse from './lighthouse.png';
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

	.code {
		max-width: 575px;
		text-align: left;
		padding: 1em;
		background: var(--back-light);
		box-shadow: inset 1px 1px 3px rgba(81, 81, 81, 0.2);
	}
</style>
