<script>
	import { afterNavigate } from '$app/navigation';

	let count = 0;
	let type = '';
	let from = '';
	let to = '';

	afterNavigate((event) => {
		count += 1;
		type = event.type;
		from = JSON.stringify(event.from);
		to = JSON.stringify(event.to);
	});
</script>

<p>{type.toString()} {count}</p>
<pre class="from">{from}</pre>
<pre class="to">{to}</pre>
