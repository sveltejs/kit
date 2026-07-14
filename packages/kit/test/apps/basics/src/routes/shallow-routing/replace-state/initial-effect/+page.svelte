<script>
	import { replaceState } from '$app/navigation';
	import { page } from '$app/state';

	$effect(() => {
		replaceState('', { initial: true });
	});
</script>

<p>initial: {page.state.initial ?? false}</p>
