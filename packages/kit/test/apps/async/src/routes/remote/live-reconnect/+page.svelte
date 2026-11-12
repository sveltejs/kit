<script>
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { live, reconnect } from './live.remote.js';

	const query = live();
	let result = $state('');
</script>

<p id="connected">{query.connected}</p>
<p id="value">{query.current}</p>
<p id="result">{result}</p>
<a href={page.url.href}>this page</a>
<button id="goto" onclick={() => goto(page.url.href, { refreshAll: true })}>goto</button>
<button id="command" onclick={() => reconnect()}>command</button>
<button
	id="direct"
	onclick={() => {
		query.reconnect().then(
			() => (result += 'connected'),
			(error) => (result += error.message + ',')
		);
	}}>direct reconnect</button
>
