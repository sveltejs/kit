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
	<button
		id="access-form-in-submit"
		type="submit"
		data-processed={form?.form_submit ? 'true' : 'false'}>Access form in submit</button
	>
</form>

<form method="POST" action="?/data_submit" use:access_data_submit>
	<button
		id="access-data-in-submit"
		type="submit"
		data-processed={form?.data_submit ? 'true' : 'false'}>Access data in submit</button
	>
</form>

<form method="POST" action="?/form_callback" use:access_form_callback>
	<button
		id="access-form-in-callback"
		type="submit"
		data-processed={form?.form_callback ? 'true' : 'false'}>Access form in callback</button
	>
</form>

<form method="POST" action="?/data_callback" use:access_data_callback>
	<button
		id="access-data-in-callback"
		type="submit"
		data-processed={form?.data_callback ? 'true' : 'false'}>Access data in callback</button
	>
</form>
