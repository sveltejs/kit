<script>
	import { pushState } from '$app/navigation';
	import { page } from '$app/state';

	$effect(() => {
		pushState('', { initial: true });
	});
</script>

<p>initial: {page.state.initial ?? false}</p>
