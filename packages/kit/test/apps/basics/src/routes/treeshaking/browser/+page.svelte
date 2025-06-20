<script>
	import { browser } from '$app/environment';
</script>

<p>
	{browser ? 'client' : 'server'}
</p>
<p>
	negated: {!browser ? 'not client' : 'not server'}
</p>
