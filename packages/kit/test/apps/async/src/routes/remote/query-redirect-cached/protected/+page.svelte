<script>
	import { logout } from '../data.remote.js';
	import { invalidateAll } from '$app/navigation';

	async function handle_logout() {
		await logout();
		await invalidateAll();
	}
</script>

<p id="protected">protected content</p>
<button id="logout" onclick={handle_logout}>logout</button>
