<script>
	import { greeting } from './data.remote.js';
</script>

<h1>{(await greeting()).bar()}</h1>
