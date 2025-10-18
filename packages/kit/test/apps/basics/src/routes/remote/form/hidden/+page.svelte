<script>
	import { get_hidden, set_hidden } from './form.remote';
	const hidden = get_hidden();
</script>

<!-- TODO use await here once async lands -->
{#await hidden then h}
	<p>await hidden().string: {h.string}</p>
	<p>await hidden().number: {h.number}</p>
	<p>await hidden().boolean: {h.boolean}</p>
{/await}

<form {...set_hidden}>
	<input {...set_hidden.fields.string.as('hidden', 'b')} />
	<input {...set_hidden.fields.number.as('hidden number', 1)} />
	<input {...set_hidden.fields.boolean.as('hidden boolean', true)} />
	<button>set hidden</button>
</form>
