<script>
	import { afterNavigate, snapshot } from '$app/navigation';

	let height = $state(0);
	let scroll = $state('');

	snapshot({
		capture: () => height,
		restore: (value) => (height = value)
	});

	afterNavigate((event) => {
		scroll = JSON.stringify(event.to?.scroll);
	});
</script>

<button onclick={() => (height = 5000)}>grow</button>
<p>scroll: {scroll}</p>

<div style="height: {height}px"></div>
