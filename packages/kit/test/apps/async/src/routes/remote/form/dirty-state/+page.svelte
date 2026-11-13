<script lang="ts">
	import { dirty_state } from './form.remote.ts';

	const scalar = dirty_state.for('scalar');
	const normalized = dirty_state.for('normalized');
	const nested = dirty_state.for('nested');
	const siblings = dirty_state.for('siblings');
</script>

<h1>Dirty state restoration</h1>

<section id="scalar">
	<form {...scalar}>
		<input id="scalar-amount" {...scalar.fields.amount.as('text', 'initial')} />
		<p id="scalar-dirty">{String(scalar.fields.amount.dirty())}</p>
	</form>
</section>

<section id="normalized">
	<form {...normalized}>
		<input id="normalized-number" {...normalized.fields.normalized.as('number', 3)} />
		<input id="normalized-enabled" {...normalized.fields.enabled.as('checkbox', true)} />
		<p id="normalized-number-dirty">{String(normalized.fields.normalized.dirty())}</p>
		<p id="normalized-enabled-dirty">{String(normalized.fields.enabled.dirty())}</p>
		<button id="normalized-reset" type="reset">reset</button>
	</form>
</section>

<section id="nested">
	<form {...nested}>
		<input id="nested-leaf" {...nested.fields.object.leaf.as('text', 'initial')} />
		<p id="nested-leaf-dirty">{String(nested.fields.object.leaf.dirty())}</p>
		<button id="nested-edit" type="button" onclick={() => nested.fields.object.leaf.set('changed')}
			>edit</button
		>
		<button
			id="nested-restore"
			type="button"
			onclick={() => nested.fields.object.leaf.set('initial')}>restore</button
		>
		<button
			id="nested-parent-restore"
			type="button"
			onclick={() => nested.fields.object.set({ leaf: 'initial' })}>parent restore</button
		>
		<button
			id="nested-root-replace"
			type="button"
			onclick={() => nested.fields.set({ object: { leaf: 'root' } })}>root replace</button
		>
	</form>
</section>

<section id="siblings">
	<form {...siblings}>
		<input id="sibling-a" {...siblings.fields.object.leaf.as('text', 'a')} />
		<input id="sibling-b" {...siblings.fields.object.sibling.as('text', 'b')} />
		<p id="sibling-a-dirty">{String(siblings.fields.object.leaf.dirty())}</p>
		<p id="sibling-b-dirty">{String(siblings.fields.object.sibling.dirty())}</p>
		<p id="siblings-dirty">{String(siblings.fields.object.dirty())}</p>
		<button id="sibling-a-edit" type="button" onclick={() => siblings.fields.object.leaf.set('a1')}
			>edit a</button
		>
		<button
			id="sibling-a-restore"
			type="button"
			onclick={() => siblings.fields.object.leaf.set('a')}>restore a</button
		>
		<button
			id="sibling-b-edit"
			type="button"
			onclick={() => siblings.fields.object.sibling.set('b1')}>edit b</button
		>
		<button
			id="sibling-b-restore"
			type="button"
			onclick={() => siblings.fields.object.sibling.set('b')}>restore b</button
		>
	</form>
</section>
