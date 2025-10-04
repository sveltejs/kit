<script>
	import { pageRedirect } from '../redirect.remote';
</script>

<!-- TODO convert to await expression once experimental async turned on -->
{#await pageRedirect() then _}
	<p>should never see this</p>
{/await}
