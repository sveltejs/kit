<script>
	import { as_value_form, get_values, reset_values } from './form.remote.ts';

	const values = $derived(await get_values());
</script>

{#each values as value (value.id)}
	<div>
		{value.text_field} - {value.number_field} - {value.select_field} - {value.color_field} - {value.range_field}
	</div>
{/each}

{#each values as value (value.id)}
	<form
		{...as_value_form.for(value.id).enhance(({ submit }) => {
			// TODO: needed to keep the values when JS is enabled, remove when reset is implemented
			submit();
		})}
	>
		<input {...as_value_form.fields.text_field.as('text', value.text_field)} />

		<input {...as_value_form.fields.number_field.as('number', value.number_field)} />

		<select {...as_value_form.fields.select_field.as('select', value.select_field)}>
			<option>apple</option>
			<option>banana</option>
			<option>cherry</option>
		</select>

		<input {...as_value_form.fields.color_field.as('color', value.color_field)} />

		<input {...as_value_form.fields.range_field.as('range', value.range_field)} />

		<button {...as_value_form.fields.id.as('submit', value.id)}>submit</button>
	</form>
{/each}

<form {...reset_values}>
	<button id="reset-values" type="submit">reset</button>
</form>
