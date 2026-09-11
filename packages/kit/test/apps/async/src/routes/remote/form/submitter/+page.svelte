<script>
	import { onMount } from 'svelte';
	import { image_form, my_form } from './form.remote.ts';

	let position_on_submit = $state('');

	onMount(() => {
		image_form.fields.position.set({ x: 1, y: 2 });

		const listener = () => {
			position_on_submit = JSON.stringify(image_form.fields.position.value());
		};
		document.addEventListener('submit', listener);
		return () => document.removeEventListener('submit', listener);
	});
</script>

<form {...my_form}>
	<button {...my_form.fields.submitter.as('submit', 'hello')}>submit</button>
</form>

<p id="result">{my_form.result}</p>

<form {...image_form}>
	<input
		{...image_form.fields.position.as('image')}
		src="data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs="
		alt="submit coordinates"
		width="20"
		height="20"
	/>
</form>

<p id="image-result">{image_form.result}</p>
<p id="image-position">{position_on_submit}</p>
