import { assert, test } from 'vitest';
import { transform_code, transform_svelte_code } from './migrate.js';

test('Updates SvelteComponentTyped #1', () => {
	const result = transform_code(
		`import { SvelteComponentTyped } from 'svelte';
        
export class Foo extends SvelteComponentTyped<{}> {}

const bar: SvelteComponentTyped = null;`
	);
	assert.equal(
		result,
		`import { SvelteComponent } from 'svelte';
        
export class Foo extends SvelteComponent<{}> {}

const bar: SvelteComponent = null;`
	);
});

test('Updates SvelteComponentTyped #2', () => {
	const result = transform_code(
		`import { SvelteComponentTyped, SvelteComponent } from 'svelte';
        
export class Foo extends SvelteComponentTyped<{}> {}

const bar: SvelteComponentTyped = null;
const baz: SvelteComponent = null;`
	);
	assert.equal(
		result,
		`import { SvelteComponent } from 'svelte';
        
export class Foo extends SvelteComponent<{}> {}

const bar: SvelteComponent = null;
const baz: SvelteComponent = null;`
	);
});

test('Updates SvelteComponentTyped #3', () => {
	const result = transform_code(
		`import { SvelteComponentTyped } from 'svelte';

interface SvelteComponent {}

export class Foo extends SvelteComponentTyped<{}> {}

const bar: SvelteComponentTyped = null;
const baz: SvelteComponent = null;`
	);
	assert.equal(
		result,
		`import { SvelteComponent as SvelteComponentTyped } from 'svelte';

interface SvelteComponent {}

export class Foo extends SvelteComponentTyped<{}> {}

const bar: SvelteComponentTyped = null;
const baz: SvelteComponent = null;`
	);
});

test('Updates typeof SvelteComponent', () => {
	const result = transform_code(
		`import { SvelteComponent } from 'svelte';
		import { SvelteComponent as C } from 'svelte';

        const a: typeof SvelteComponent = null;
        function b(c: typeof SvelteComponent) {}
		const c: typeof SvelteComponent<any> = null;
		const d: typeof C = null;
        `
	);
	assert.equal(
		result,
		`import { SvelteComponent } from 'svelte';
		import { SvelteComponent as C } from 'svelte';

        const a: typeof SvelteComponent<any> = null;
        function b(c: typeof SvelteComponent<any>) {}
		const c: typeof SvelteComponent<any> = null;
		const d: typeof C<any> = null;
        `
	);
});

test('Updates Action and ActionReturn', () => {
	const result = transform_code(
		`import { Action, ActionReturn } from 'svelte/action';

        const a: Action = () => {};
        const b: Action<HTMLDivElement> = () => {};
        const c: Action<HTMLDivElement, true> = () => {};
        const d: Action<HTMLDivElement, true, {}> = () => {};
		const e: ActionReturn = () => {};
		const f: ActionReturn<true> = () => {};
		const g: ActionReturn<true, {}> = () => {};
        `
	);
	assert.equal(
		result,

		`import { Action, ActionReturn } from 'svelte/action';

        const a: Action<HTMLElement, any> = () => {};
        const b: Action<HTMLDivElement, any> = () => {};
        const c: Action<HTMLDivElement, true> = () => {};
        const d: Action<HTMLDivElement, true, {}> = () => {};
		const e: ActionReturn<any> = () => {};
		const f: ActionReturn<true> = () => {};
		const g: ActionReturn<true, {}> = () => {};
        `
	);
});

test('Updates svelte:options #1', () => {
	const result = transform_svelte_code(
		`<svelte:options tag="asd-asd" />
		
		<div>hi</div>`
	);
	assert.equal(
		result,
		`<svelte:options customElement="asd-asd" />
		
		<div>hi</div>`
	);
});

test('Updates svelte:options #2', () => {
	const result = transform_svelte_code(
		`<script>
		export let foo;
		</script>
		
		<svelte:options
			immutable={true}
			tag="asd-asd"></svelte:options>
		
		<div>hi</div>`
	);
	assert.equal(
		result,
		`<script>
		export let foo;
		</script>
		
		<svelte:options
			immutable={true}
			customElement="asd-asd"></svelte:options>
		
		<div>hi</div>`
	);
});

test('Updates transitions', () => {
	const result = transform_svelte_code(
		`<div transition:fade />
		<div transition:fade={true} />
		<div transition:fade></div>
		<div transition:fade|local />
		<div in:fade />
		<div in:fade={true} />
		<div in:fade></div>
		<div in:fade|local />
		<div out:fade />
		<div out:fade={true} />
		<div out:fade></div>
		<div out:fade|local />

		<div transitionn:fade />
		<div allin:fade />
		`
	);
	assert.equal(
		result,
		`<div transition:fade|global />
		<div transition:fade|global={true} />
		<div transition:fade|global></div>
		<div transition:fade|local />
		<div in:fade|global />
		<div in:fade|global={true} />
		<div in:fade|global></div>
		<div in:fade|local />
		<div out:fade|global />
		<div out:fade|global={true} />
		<div out:fade|global></div>
		<div out:fade|local />

		<div transitionn:fade />
		<div allin:fade />
		`
	);
});
