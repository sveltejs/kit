<script>
	import { next, time } from './stream.remote.js';

	let streamValues = $state([]);

	async function startStream() {
		streamValues = [];

		try {
			// Test async iterable usage
			for await (const t of time()) {
				streamValues = [...streamValues, t];
			}
		} catch (error) {
			streamValues = ['ERROR'];
		}
	}

	startStream();
</script>

<!-- force them into different template effects to be sure they really do update -->
{#if true}
	<p id="time-promise">{#await time() then t}{t}{/await}</p>
{/if}

{#if true}
	<p id="time-resource">{time().current}</p>
{/if}

{#if true}
	<p id="time-stream">[{streamValues.join(', ')}]</p>
{/if}

<button onclick={() => next()}>Continue</button>
