<script>
	import { browser } from '$app/env';
</script>

<p>
	{browser ? 'client' : 'server'}
</p>
<p>
	negated: {!browser ? 'server' : 'client'}
</p>
