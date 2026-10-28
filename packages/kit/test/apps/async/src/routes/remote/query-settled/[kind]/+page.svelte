<script>
	import { goto, onNavigate } from '$app/navigation';
	import { page } from '$app/state';
	import { get_post, get_batched_post, get_live_post } from '../data.remote.js';

	const get_query =
		page.params.kind === 'batch'
			? () => get_batched_post('post')
			: page.params.kind === 'live'
				? get_live_post
				: get_post;

	const open = $derived('open' in page.state && page.state.open);

	let captured = $state('');
	let result = $state('');

	/** @param {string} method */
	async function check_microtasks(method) {
		result = '';
		const q = get_query();
		const promise =
			method === 'await'
				? Promise.resolve(q)
				: method === 'then'
					? q.then()
					: method === 'catch'
						? q.catch((error) => {
								throw error;
							})
						: q.finally(() => {});
		result = await Promise.race([
			promise.then((post) => post.title),
			(async () => {
				// Drain microtasks without letting a timer or animation frame run.
				for (let i = 0; i < 50; i++) await Promise.resolve();
				return 'pending';
			})()
		]);
	}

	onNavigate((navigation) => {
		return new Promise((resolve) => {
			const transition = document.startViewTransition(async () => {
				resolve();
				await navigation.complete;
			});
			transition.ready.then(() => {
				if (open) {
					captured = getComputedStyle(
						document.documentElement,
						'::view-transition-new(detail)'
					).width;
				}
			});
		});
	});
</script>

<h1>{(await get_query()).title}</h1>
<button
	onclick={() => {
		captured = '';
		goto('?open', { shallow: true, state: { open: true } });
	}}>open</button
>
<p id="captured">{captured}</p>
{#each ['await', 'then', 'catch', 'finally'] as method}
	<button onclick={() => check_microtasks(method)}>{method}</button>
{/each}
<p id="result">{result}</p>

{#if open}
	<svelte:boundary>
		<p id="detail" class="content">{(await get_query()).title}</p>
		{#snippet pending()}<p id="detail" class="pending">loading…</p>{/snippet}
	</svelte:boundary>
{/if}

<style>
	#detail {
		view-transition-name: detail;
		height: 40px;
	}
	.pending {
		width: 10px;
	}
	.content {
		width: 300px;
	}
</style>
