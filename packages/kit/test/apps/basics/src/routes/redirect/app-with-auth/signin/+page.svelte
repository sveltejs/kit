<script>
	import { invalidateAll } from '$app/navigation';

	function login() {
		document.cookie = 'logged_in=1;path=/redirect/app-with-auth';
		invalidateAll();
	}
</script>

<h1>signin</h1>
<button on:click={login} data-testid="login"> login </button>
