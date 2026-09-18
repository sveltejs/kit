<script lang="ts">
	import { myform } from './form.remote.ts';
	import { schema } from './schema.ts';
</script>

<form {...myform.preflight(schema)} onchange={() => myform.validate()}>
	<select {...myform.fields.picked.as('select')}>
		<option value="">-- pick --</option>
		<option value="a">A</option>
		<option value="b">B</option>
	</select>

	<input {...myform.fields.text.as('text')} />

	<button type="button" onclick={() => myform.validate({ all: true })}>validate all</button>
	<button>submit</button>
</form>

<p id="picked-issues">
	{myform.fields.picked
		.issues()
		?.map((i) => i.message)
		.join(',') ?? ''}
</p>
