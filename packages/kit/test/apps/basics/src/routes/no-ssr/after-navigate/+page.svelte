<script>
	import { afterNavigate } from '$app/navigation';

	let count = 0;
	let type = '';
	/** @type {string | undefined} */
	let from;
	/** @type {string | undefined} */
	let scroll;

	afterNavigate((event) => {
		count += 1;
		type = event.type;
		from = JSON.stringify(event.from);
		scroll = JSON.stringify(event.to?.scroll);
	});
</script>

<p>{type.toString()} {count}</p>
<h2>from: {from}</h2>
<h3>scroll: {scroll}</h3>

<div style="height: 2000px"></div>
