<script>
	import { afterNavigate } from '$app/navigation';

	let count = 0;
	let type = '';

	afterNavigate((event) => {
		count += 1;
		type = event.type;
	});
</script>

<p>{type.toString()} {count}</p>
