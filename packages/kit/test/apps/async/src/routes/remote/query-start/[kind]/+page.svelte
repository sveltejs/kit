<script lang="ts">
	import type { RemoteQuery } from '$app/server';
	import { single, batch } from '../data.remote.js';

	const { params } = $props();
	const query = (n: number) => (params.kind === 'batch' ? batch(n) : single(n));
	const answer = query(1);
	const initial = await answer;
	let waiting = $state<RemoteQuery<number>>();
	let frames = $state<number>();

	function inspect(resource: RemoteQuery<number>) {
		const original = window.requestAnimationFrame;
		let count = 0;
		window.requestAnimationFrame = (callback) => {
			count += 1;
			return original.call(window, callback);
		};
		try {
			for (let i = 0; i < 1000; i++) {
				void resource.ready;
				void resource.current;
				void resource.loading;
				void resource.error;
				void resource.then;
				void resource.catch;
				void resource.finally;
			}
		} finally {
			window.requestAnimationFrame = original;
		}
		frames = count;
	}
</script>

<p id="initial">{initial}</p>
<p id="answer">{answer.current}</p>
<p id="waiting">{waiting?.ready} / {waiting?.current}</p>
<output>{frames}</output>
<button id="inspect-answer" onclick={() => inspect(answer)}>Inspect answer</button>
<button id="start" onclick={() => (waiting = query(2))}>Start</button>
<button id="inspect-waiting" onclick={() => waiting && inspect(waiting)}>Inspect waiting</button>
<button id="refresh" onclick={() => answer.refresh()}>Refresh</button>
