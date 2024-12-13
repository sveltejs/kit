<script>
	import { page, updated } from '$app/state';
</script>

<h1>{`${updated.current}`}</h1>

<button
	onclick={async () => {
		console.log(updated.current);
		console.log(await updated.check());
	}}>click</button
>
