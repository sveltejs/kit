<script>
	import { enhance } from '$app/forms';

	export let form;

	const accessFormSubmit = (node) => {
		return enhance(node, ({ form }) => {});
	};
	const accessDataSubmit = (node) => {
		return enhance(node, ({ data }) => {});
	};
	const accessFormCallback = (node) => {
		return enhance(
			node,
			() =>
				({ form, update }) =>
					update()
		);
	};
	const accessDataCallback = (node) => {
		return enhance(
			node,
			() =>
				({ data, update }) =>
					update()
		);
	};
</script>

<form method="POST" action="?/formSubmit" use:accessFormSubmit>
	<button id="access-form-in-submit" type="submit"
		>{form?.formSubmit ? 'processed' : 'not processed'}</button
	>
</form>

<form method="POST" action="?/dataSubmit" use:accessDataSubmit>
	<button id="access-data-in-submit" type="submit"
		>{form?.dataSubmit ? 'processed' : 'not processed'}</button
	>
</form>

<form method="POST" action="?/formCallback" use:accessFormCallback>
	<button id="access-form-in-callback" type="submit"
		>{form?.formCallback ? 'processed' : 'not processed'}</button
	>
</form>

<form method="POST" action="?/dataCallback" use:accessDataCallback>
	<button id="access-data-in-callback" type="submit"
		>{form?.dataCallback ? 'processed' : 'not processed'}</button
	>
</form>
