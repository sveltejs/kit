<script lang="ts">
	import { afterNavigate } from '$app/navigation';
	import type { Props, RenderNode } from '../props.svelte.js';

	const { page, components, onerror, tree, form, error }: Props = $props();

	let mounted = $state(false);
	let navigated = $state(false);
	let title = $state('');

	afterNavigate(() => {
		if (mounted) {
			navigated = true;
			title = document.title || 'untitled page';
		} else {
			mounted = true;
		}
	});
</script>

{#snippet node(n: RenderNode, depth: number)}
	{const Component = $derived(n.component)}
	{const Error = $derived(n.error)}
	{const data = $derived(n.data)}

	<svelte:boundary {onerror}>
		{#if n.child}
			<!-- svelte-ignore binding_property_non_reactive -->
			<Component bind:this={components[depth]} {data} {form} params={page.params}>
				{@render node(n.child, depth + 1)}
			</Component>
		{:else}
			<!-- svelte-ignore binding_property_non_reactive -->
			<Component bind:this={components[depth]} {data} {form} params={page.params} {error} />
		{/if}

		{#snippet failed(error: unknown)}
			<Error {error} />
		{/snippet}
	</svelte:boundary>
{/snippet}

{@render node(tree, 0)}

{#if mounted}
	<div
		id="svelte-announcer"
		aria-live="assertive"
		aria-atomic="true"
		style="position: absolute; left: 0; top: 0; clip: rect(0 0 0 0); clip-path: inset(50%); overflow: hidden; white-space: nowrap; width: 1px; height: 1px"
	>
		{#if navigated}
			{title}
		{/if}
	</div>
{/if}
