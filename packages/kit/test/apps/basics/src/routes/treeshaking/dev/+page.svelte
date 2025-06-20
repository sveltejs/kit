<script>
	import { dev } from '$app/environment';
</script>

<p>{dev ? 'dev' : 'prod'}</p>
<p>negated: {!dev ? 'not dev' : 'not prod'}</p>
