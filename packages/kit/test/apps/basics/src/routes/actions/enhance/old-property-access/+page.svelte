<script>
	import { enhance } from '$app/forms';

	export let form;

	const access_form_submit = (node) => {
		return enhance(node, ({ form }) => {});
	};
	const access_data_submit = (node) => {
		return enhance(node, ({ data }) => {});
	};
	const access_form_callback = (node) => {
		return enhance(
			node,
			() =>
				({ form, update }) =>
					update()
		);
	};
	const access_data_callback = (node) => {
		return enhance(
			node,
			() =>
				({ data, update }) =>
					update()
		);
	};
</script>

<form method="POST" action="?/form_submit" use:access_form_submit>
	<button id="access-form-in-submit" type="submit"
		>{form?.form_submit ? 'processed' : 'not processed'}</button
	>
</form>

<form method="POST" action="?/data_submit" use:access_data_submit>
	<button id="access-data-in-submit" type="submit"
		>{form?.data_submit ? 'processed' : 'not processed'}</button
	>
</form>

<form method="POST" action="?/form_callback" use:access_form_callback>
	<button id="access-form-in-callback" type="submit"
		>{form?.form_callback ? 'processed' : 'not processed'}</button
	>
</form>

<form method="POST" action="?/data_callback" use:access_data_callback>
	<button id="access-data-in-callback" type="submit"
		>{form?.data_callback ? 'processed' : 'not processed'}</button
	>
</form>
