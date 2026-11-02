<script>
	import { afterNavigate } from '$app/navigation';

	let count = 0;
	let type = '';
	/** @type {string | undefined} */
	let from;
	/** @type {string | undefined} */
	let to_scroll;

	afterNavigate((event) => {
		count += 1;
		type = event.type;
		from = JSON.stringify(event.from);
		to_scroll = JSON.stringify(event.to?.scroll);
	});
</script>

<p>{type.toString()} {count}</p>
<h2>from: {from}</h2>
<h3>to.scroll: {to_scroll}</h3>

<div style="height: 3000px"></div>
