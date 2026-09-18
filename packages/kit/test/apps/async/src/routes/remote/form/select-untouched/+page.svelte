<script lang="ts">
	import { myform as _myform } from './form.remote.ts';
	import { schema } from './schema.ts';

	const uid = $props.id();
	const myform = _myform.for(uid);
</script>

<form {...myform.preflight(schema)} onchange={() => myform.validate()}>
	<select {...myform.fields.picked.as('select')}>
		<option value="">-- pick --</option>
		<option value="a">A</option>
		<option value="b">B</option>
	</select>

	<input {...myform.fields.text.as('text')} />
	<button>submit</button>
</form>
