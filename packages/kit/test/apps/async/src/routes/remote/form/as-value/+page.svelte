<script>
	import { as_value_form, get_values, reset_values } from './form.remote.ts';
	import Form from './Form.svelte';

	const values = $derived(await get_values());
</script>

{#each values as value (value.id)}
	<div>
		{value.text_field} - {value.number_field} - {value.select_field} - {value.color_field} - {value.range_field}
		- {value.checkbox_field}
	</div>
{/each}

<div class="forms">
	{#each values as value (value.id)}
		<Form {value} />
	{/each}
</div>

<div>
	<p id="set-value-display">{as_value_form.fields.text_field.value()}</p>
	<button id="set-text-field" onclick={() => as_value_form.fields.text_field.set('Set via method')}
		>set text field</button
	>
	<input
		data-testid="as-value-set-input"
		{...as_value_form.fields.text_field.as('text', 'default text')}
	/>
</div>

<form {...reset_values}>
	<button id="reset-values" type="submit">reset</button>
</form>

<style>
	.forms {
		display: flex;
		flex-wrap: wrap;
		gap: 0.25rem;
	}
</style>
