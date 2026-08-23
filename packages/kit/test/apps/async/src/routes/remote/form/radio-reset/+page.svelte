<script lang="ts">
	import { get_settings, update_settings } from './form.remote.ts';

	const settings = $derived(await get_settings());

	const options = ['public', 'private'];
	const tags = ['red', 'green', 'blue'];
</script>

<p id="query-value">{JSON.stringify(settings)}</p>

<form {...update_settings}>
	{#each options as option}
		<label>
			<input {...update_settings.fields.visibility.as('radio', option)} />
			{option}
		</label>
	{/each}

	{#each tags as tag}
		<label>
			<input {...update_settings.fields.tags.as('checkbox', tag)} />
			{tag}
		</label>
	{/each}

	<label>
		<input {...update_settings.fields.notifications.as('checkbox')} />
		notifications
	</label>

	<button id="save">Save</button>
</form>

<p id="fields-value">{JSON.stringify(update_settings.fields.value())}</p>
