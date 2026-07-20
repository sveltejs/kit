<script lang="ts">
	import { reset_id } from './form.remote';
</script>

<form {...reset_id}>
	<input id="reset" {...reset_id.fields.message.as('text')} />
	<button>submit</button>
	<button type="reset">reset</button>
</form>

{#each reset_id.fields.message.issues() as issue (issue)}
	<p class="error">{issue.message}</p>
{/each}

{#if reset_id.result?.message}
	<div id="result">{reset_id.result.message}</div>
{/if}
