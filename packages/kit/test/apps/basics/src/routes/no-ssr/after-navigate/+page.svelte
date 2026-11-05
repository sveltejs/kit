<script>
	import { afterNavigate } from '$app/navigation';

	let count = 0;
	let type = '';
	/** @type {string | undefined} */
	let from;

	afterNavigate((event) => {
		count += 1;
		type = event.type;
		from = JSON.stringify(event.from);
	});
</script>

<p>{type.toString()} {count}</p>
<h2>from: {from}</h2>
