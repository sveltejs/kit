<script>
	import { prerendered, get_count, set_count, set_count_form } from './count.remote.js';

	let count = $state(null);
	let prerendered_result = $state(null);
</script>

<p id="count">{count}</p>

<button onclick={async () => (count = await get_count())}>get count</button>

<button onclick={async () => (count = await set_count(0))} id="reset-btn">reset</button>

<form
	{...set_count_form.enhance(async ({ submit }) => {
		await submit().updates(get_count());
		count = await get_count();
	})}
>
	<input type="number" name="count" />
	<button>submit</button>
</form>

<button id="fetch-prerendered" onclick={async () => (prerendered_result = await prerendered())}>
	get prerendered
</button>

<p id="prerendered">{prerendered_result}</p>
