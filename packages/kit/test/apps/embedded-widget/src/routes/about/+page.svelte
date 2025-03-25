<script>
	import { base } from '$app/paths';

	let { data } = $props();
</script>

<div>
	The server says:
	<p data-testid="about">
		{data.about}
	</p>
	<p>
		<a data-testid="back" href="{base}/embed">Back to the widget</a>
	</p>
</div>

<style>
    div {
        border: 1px solid black;
        padding: 1rem;

        background-color: #008080;
        color: #DDD;
    }
</style>
