<script>
	import { refresh } from '$app/navigation';

	export let data;
</script>

<div>
	<button
		id="multiple-batched"
		onclick={(event) => {
			const btn = event.currentTarget;
			refresh('multiple:invalidations-go-brr');
			refresh('multiple:invalidations-go-brr');

			Promise.resolve()
				.then(() => refresh('multiple:invalidations-go-brr'))
				.then(() => {
					btn.dataset.done = 'true';
				});
		}}>{data.count}</button
	>
</div>
