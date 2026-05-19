<script>
	import { greeting } from './data.remote.ts';
</script>

<h1>{(await greeting()).bar()}</h1>
