<script lang="ts">
	import { as_value_form, type get_values } from './form.remote';

	const { value }: { value: Awaited<ReturnType<typeof get_values>>[number] } = $props();
	const form = $derived(as_value_form.for(value.id));
</script>

<form class="form" {...form}>
	<input {...form.fields.text_field.as('text', value.text_field)} />

	<input {...form.fields.number_field.as('number', value.number_field)} />

	<select {...form.fields.select_field.as('select', value.select_field)}>
		<option>apple</option>
		<option>banana</option>
		<option>cherry</option>
	</select>

	<input {...form.fields.color_field.as('color', value.color_field)} />

	<input {...form.fields.range_field.as('range', value.range_field)} />

	<label
		>Checkbox
		<input {...form.fields.checkbox_field.as('checkbox', value.checkbox_field)} />
	</label>
	<button {...form.fields.id.as('submit', value.id)}>submit</button>
</form>

<style>
	.form {
		display: flex;
		flex-direction: column;
		max-width: 200px;
		gap: 0.25rem;
		padding: 0.5rem;
		background: #eee;
	}
</style>
