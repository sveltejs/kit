<script>
	import { set_favourite } from './form.remote.ts';
</script>

<form {...set_favourite}>
	<select {...set_favourite.fields.normal.as('select')}>
		<option value="">None</option>
		<option value="js">JavaScript</option>
		<option value="ts">TypeScript</option>
	</select>

	<select {...set_favourite.fields.with_default.as('select')}>
		<option value="">None</option>
		<option value="js" selected>JavaScript</option>
		<option value="ts">TypeScript</option>
	</select>

	<select {...set_favourite.fields.disabled_default.as('select')}>
		<option value="" selected disabled>None</option>
		<option value="js">JavaScript</option>
		<option value="ts">TypeScript</option>
	</select>

	<select {...set_favourite.fields.multiple.as('select multiple')}>
		<option value="js" selected>JavaScript</option>
		<option value="ts" selected>TypeScript</option>
		<option value="py">Python</option>
	</select>

	<button>submit</button>
</form>

<p>result: {JSON.stringify(set_favourite.result)}</p>
