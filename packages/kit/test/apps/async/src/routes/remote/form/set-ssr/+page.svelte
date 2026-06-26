<script>
	import { editData } from './form.remote';

	const form = editData;
	form.fields.set({ description: 'ssr' });
	form.fields.description.set('nested');
</script>

<div id="description">Description: {form.fields.description.value()}</div>

<form {...form}>
	<input {...form.fields.name.as('text')} />
	<button type="submit">Submit</button>
</form>
