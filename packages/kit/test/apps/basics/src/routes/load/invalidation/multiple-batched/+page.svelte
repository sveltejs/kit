<script>
	import { invalidate } from '$app/navigation';

	export let data;
</script>

<div>
	<button
		id="multiple-batched"
		on:click={(event) => {
			const btn = event.currentTarget;
			invalidate('multiple:invalidations-go-brr');
			invalidate('multiple:invalidations-go-brr');

			Promise.resolve()
				.then(() => invalidate('multiple:invalidations-go-brr'))
				.then(() => {
					btn.dataset.done = 'true';
				});
		}}>{data.count}</button
	>
</div>
