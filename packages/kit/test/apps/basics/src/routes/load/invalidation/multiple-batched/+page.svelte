<script>
	import { invalidate } from '$app/navigation';

	export let data;
</script>

<div>
	<button
		id="multiple-batched"
		on:click={(event) => {
			invalidate('multiple:invalidations-go-brr');
			invalidate('multiple:invalidations-go-brr');

			Promise.resolve()
				.then(() => invalidate('multiple:invalidations-go-brr'))
				.then(() => {
					event.currentTarget.dataset.done = 'true';
				});
		}}>{data.count}</button
	>
</div>
