<script>
	import { login } from '../data.remote.js';
	import { invalidateAll } from '$app/navigation';

	async function handle_login() {
		await login();
		await invalidateAll();
	}
</script>

<p id="redirected">redirected</p>
<button id="login-from-redirected" onclick={handle_login}>login</button>
<a href="/remote/query-redirect-cached/protected">back to protected</a>
