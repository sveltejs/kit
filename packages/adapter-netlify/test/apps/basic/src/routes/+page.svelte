<script>
	import { prerendered } from './remote-read.remote.js';
</script>

<h1>Hello from SvelteKit</h1>

<p>Remote: {await prerendered()}</p>
