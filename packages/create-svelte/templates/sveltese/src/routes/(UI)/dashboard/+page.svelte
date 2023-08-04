<script lang="ts">
	import { goto } from '$app/navigation'
	import type { PageData } from './$types'

	export let data: PageData
	const user = data?.user

 	async function signOutSSR() {
		await fetch('/api/auth', { method: 'DELETE' });
    goto('/login')
	}
</script>

Dashboard




{#if user}
	<h2 class="card-title">Welcome, {user.name}</h2>
	<p class="text-center text-success">You are logged in</p>
	<button class="btn btn-warning" on:click={signOutSSR}>Sign out</button>
{/if}



