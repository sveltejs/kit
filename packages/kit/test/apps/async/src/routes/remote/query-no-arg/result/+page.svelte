<script>
	import { get_no_arg } from '../data.remote.js';

	// reached via client-side navigation, so this resolves by fetching the
	// remote endpoint (not from the hydration payload). The fetch sends no
	// `payload` search param; the server must key the response on `''` so the
	// client's `id/` cache key matches and the value resolves.
	const value = await get_no_arg();
</script>

<p id="no-arg-value">{value}</p>
