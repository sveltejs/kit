<script lang="ts">
	import { create_survey, get_settings, get_surveys, update_settings } from './form.remote.ts';

	const settings = $derived(await get_settings());
	const surveys = $derived(await get_surveys());

	const options = ['public', 'private'];
	const tags = ['red', 'green', 'blue'];
</script>

<p id="settings">{JSON.stringify(settings)}</p>

<form id="edit" {...update_settings}>
	<input {...update_settings.fields.title.as('text', settings.title)} />

	{#each options as option}
		<label>
			<input {...update_settings.fields.visibility.as('radio', option, settings.visibility)} />
			{option}
		</label>
	{/each}

	{#each tags as tag}
		<label>
			<input {...update_settings.fields.tags.as('checkbox', tag, settings.tags)} />
			{tag}
		</label>
	{/each}

	<button type="reset">discard</button>
	<button>save</button>
</form>

<p id="edit-value">{JSON.stringify(update_settings.fields.value())}</p>

<form id="create" {...create_survey}>
	{#each options as option}
		<label>
			<input {...create_survey.fields.visibility.as('radio', option)} />
			{option}
		</label>
	{/each}

	{#each tags as tag}
		<label>
			<input {...create_survey.fields.tags.as('checkbox', tag)} />
			{tag}
		</label>
	{/each}

	<button>create</button>
</form>

<p id="surveys">{JSON.stringify(surveys)}</p>
