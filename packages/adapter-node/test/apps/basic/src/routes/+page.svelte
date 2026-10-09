<script>
	import { prerendered } from './remote-read.remote.js';
	let toggle = $state(false);
</script>

<h1>Hello world!</h1>

<button onclick={() => (toggle = !toggle)}>Toggle: {toggle}</button>

<p>Remote: {await prerendered()}</p>
