<script lang="ts">
	import { page } from '$app/state';
	import { conflict } from './form.remote';

	let error = $state('');

	function set_nested() {
		conflict.fields.set({ a: 'scalar' });
		try {
			conflict.fields.a.b.set('nested');
		} catch (e) {
			error = (e as Error).message;
		}
	}

	if (page.url.searchParams.has('set')) set_nested();
</script>

<form
	{...conflict.enhance(async ({ submit }) => {
		try {
			await submit();
		} catch (e) {
			error = (e as Error).message;
		}
	})}
>
	<input {...conflict.fields.a.as('text', 'scalar')} />
	<input {...conflict.fields.a.b.as('text', 'nested')} />
	<button>Submit</button>
</form>
<button onclick={set_nested}>Set nested value</button>
<p id="error">{error}</p>
