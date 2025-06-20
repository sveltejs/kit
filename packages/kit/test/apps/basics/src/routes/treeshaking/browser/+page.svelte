<script>
	import { browser } from '$app/environment';
</script>

<p>
	{browser ? 'browser' : 'server'}
</p>
<p>
  negated: {!browser ? 'not browser' : 'not server'}
</p>
