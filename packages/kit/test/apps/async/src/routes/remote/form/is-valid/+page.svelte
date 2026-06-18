<script lang="ts">
	import { test_form } from './form.remote';
</script>

<p id="foo">foo: {test_form.fields?.foo?.isValid()}</p>
<p id="nested-bar">nested.bar: {test_form.fields?.nested?.bar?.isValid()}</p>
<p id="overall-fields">overall fields: {test_form.fields.isValid()}</p>
<p id="overall-form">overall form: {test_form.isValid}</p>

<form {...test_form} oninput={() => test_form.validate()}>
	<input {...test_form.fields.foo.as('text')} />
	<input {...test_form.fields.nested.bar.as('text')} />
	<button type="submit">Submit</button>
</form>
