<script>
	// This server-only module is also imported by +page.server.js.
	// The guard must still detect this client-side import and report
	// "Cannot import ... into the browser" rather than following the
	// server branch and throwing "An impossible situation occurred".
	import { secret } from '$lib/secret.server.js';
</script>

<p>{secret}</p>
