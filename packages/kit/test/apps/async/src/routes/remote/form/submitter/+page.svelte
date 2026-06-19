<script>
	import { my_form } from './form.remote.ts';

	let enhance_result = $state('');
</script>

<form
	{...my_form.enhance(async (form, data) => {
		enhance_result = data.submitter;
		if (await form.submit()) {
			form.element.reset();
		}
	})}
>
	<button {...my_form.fields.submitter.as('submit', 'hello')}>submit</button>
</form>

<p id="result">{my_form.result}</p>
<p id="enhance-result">{enhance_result}</p>
