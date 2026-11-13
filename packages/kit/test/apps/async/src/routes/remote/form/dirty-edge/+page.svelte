<script lang="ts">
	import { edge_state } from './form.remote.ts';

	const checkbox = edge_state.for('checkbox');
	const file = edge_state.for('file');
	const parent = edge_state.for('parent');
	const lifecycle = edge_state.for('lifecycle');
	let show_lifecycle = true;
</script>

<section id="checkbox">
	<form {...checkbox}>
		<input id="edge-checkbox" {...checkbox.fields.checkbox.as('checkbox', false)} />
		<p id="edge-checkbox-dirty">{String(checkbox.fields.checkbox.dirty())}</p>
	</form>
</section>

<section id="file">
	<form {...file}>
		<input id="edge-file" {...file.fields.file.as('file')} />
		<p id="edge-file-dirty">{String(file.fields.file.dirty())}</p>
	</form>
</section>

<section id="parent">
	<form {...parent}>
		<input id="edge-leaf" {...parent.fields.object.leaf.as('text', 'initial')} />
		<input id="edge-sibling" {...parent.fields.object.sibling.as('text', 'sibling')} />
		<p id="edge-parent-dirty">{String(parent.fields.object.dirty())}</p>
		<p id="edge-leaf-dirty">{String(parent.fields.object.leaf.dirty())}</p>
	</form>
	<button
		id="edge-parent-set"
		type="button"
		onclick={() => parent.fields.object.set({ leaf: 'initial' })}>set parent</button
	>
</section>

<section id="lifecycle">
	<button id="edge-toggle" type="button" onclick={() => (show_lifecycle = !show_lifecycle)}
		>toggle</button
	>
	{#if show_lifecycle}
		<form {...lifecycle}>
			<input id="edge-lifecycle" {...lifecycle.fields.lifecycle.as('text', 'initial')} />
			<p id="edge-lifecycle-dirty">{String(lifecycle.fields.lifecycle.dirty())}</p>
		</form>
	{/if}
</section>
