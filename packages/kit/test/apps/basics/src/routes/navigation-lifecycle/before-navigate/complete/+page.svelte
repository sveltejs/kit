<script>
	import { beforeNavigate } from '$app/navigation';

	beforeNavigate(({ complete }) => {
		complete.then(() => {
			console.log('complete');
		});
	});
</script>

<a href="/navigation-lifecycle/before-navigate/redirect">redirect</a>
