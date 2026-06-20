<script>
	import { set_favourite } from './form.remote.ts';
</script>

<form {...set_favourite}>
	<select {...set_favourite.fields.lang.as('select multiple')}>
		<option value="js" selected>JavaScript</option>
		<option value="ts" selected>TypeScript</option>
		<option value="py">Python</option>
	</select>

	<button>submit</button>
</form>

<p>result: {set_favourite.result?.lang}</p>
