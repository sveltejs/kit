<script>
	import { pageRedirect } from '../redirect.remote';
</script>

<svelte:boundary>
	{await pageRedirect()}
	<p>should never see this</p>
</svelte:boundary>
