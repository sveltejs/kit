<script>
	import { set_favourite } from './form.remote.ts';
</script>

<form {...set_favourite}>
	<select {...set_favourite.fields.language.as('select')}>
		<option value="">None</option>
		<option value="js" selected>JavaScript</option>
		<option value="ts">TypeScript</option>
	</select>

	<button>submit</button>
</form>

<p>result: {set_favourite.result?.language}</p>
