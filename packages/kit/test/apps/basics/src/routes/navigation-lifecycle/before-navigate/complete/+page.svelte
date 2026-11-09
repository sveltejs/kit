<script>
	import { beforeNavigate } from '$app/navigation';

	beforeNavigate(({ complete, to }) => {
		console.log(`beforeNavigate ${to?.url.pathname}`);
		complete.then(() => {
			console.log('complete');
		});
	});
</script>

<a href="/navigation-lifecycle/before-navigate/redirect">redirect</a>
