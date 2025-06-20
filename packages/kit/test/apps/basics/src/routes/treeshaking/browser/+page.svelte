<script>
	import { browser } from '$app/environment';
</script>

<p>
	{browser ? 'browser' : 'server'}
</p>
