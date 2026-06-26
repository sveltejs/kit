<script>
	import { dev } from '$app/env';
</script>

<p>{dev ? 'not prod' : 'prod'}</p>
<p>negated: {!dev ? 'prod' : 'not prod'}</p>
