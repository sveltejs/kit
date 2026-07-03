<script>
	import { login } from './data.remote.js';
	import { invalidateAll } from '$app/navigation';

	async function handle_login() {
		await login();
		await invalidateAll();
	}
</script>

<button id="login" onclick={handle_login}>login</button>
<a href="/remote/query-redirect-cached/protected">protected</a>
