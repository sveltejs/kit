import { assert, test } from 'vitest';
import { transform_code, transform_svelte_code, update_pkg_json_content } from './migrate.js';

test('Updates SvelteComponentTyped #1', () => {
	const result = transform_code(
		`import { SvelteComponentTyped } from 'svelte';
        
export class Foo extends SvelteComponentTyped<{}> {}

const bar: SvelteComponentTyped = null;`,
		true
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
const baz: SvelteComponent = null;`,
		true
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
const baz: SvelteComponent = null;`,
		true
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

test('Updates SvelteComponentTyped (jsdoc)', () => {
	const result = transform_code(
		`
		/** @type {import('svelte').SvelteComponentTyped} */
		const bar = null;
		/** @type {import('svelte').SvelteComponentTyped<any>} */
		const baz = null;
		`,
		false
	);
	assert.equal(
		result,
		`
		/** @type {import('svelte').SvelteComponent} */
		const bar = null;
		/** @type {import('svelte').SvelteComponent<any>} */
		const baz = null;
		`
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
        `,
		true
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

test('Updates typeof SvelteComponent (jsdoc)', () => {
	const result = transform_code(
		`
		/** @type {typeof import('svelte').SvelteComponent} */
        const a = null;
		/** @type {typeof import('svelte').SvelteComponent<any>} */
		const c = null;
		/** @type {typeof C} */
		const d: typeof C = null;
        `,
		false
	);
	assert.equal(
		result,
		`
		/** @type {typeof import('svelte').SvelteComponent<any>} */
        const a = null;
		/** @type {typeof import('svelte').SvelteComponent<any>} */
		const c = null;
		/** @type {typeof C} */
		const d: typeof C = null;
        `
	);
});

test('Updates Action and ActionReturn', () => {
	const result = transform_code(
		`import type { Action, ActionReturn } from 'svelte/action';

        const a: Action = () => {};
        const b: Action<HTMLDivElement> = () => {};
        const c: Action<HTMLDivElement, true> = () => {};
        const d: Action<HTMLDivElement, true, {}> = () => {};
		const e: ActionReturn = () => {};
		const f: ActionReturn<true> = () => {};
		const g: ActionReturn<true, {}> = () => {};
        `,
		true
	);
	assert.equal(
		result,

		`import type { Action, ActionReturn } from 'svelte/action';

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

test('Updates Action and ActionReturn (jsdoc)', () => {
	const result = transform_code(
		`
		/** @type {import('svelte/action').Action} */
        const a = () => {};
		/** @type {import('svelte/action').Action<HTMLDivElement>} */
        const b = () => {};
		/** @type {import('svelte/action').Action<HTMLDivElement, true>} */
        const c = () => {};
		/** @type {import('svelte/action').Action<HTMLDivElement, true, {}>} */
        const d = () => {};
		/** @type {import('svelte/action').ActionReturn} */
		const e = () => {};
		/** @type {import('svelte/action').ActionReturn<true>} */
		const f = () => {};
		/** @type {import('svelte/action').ActionReturn<true, {}>} */
		const g = () => {};
        `,
		false
	);
	assert.equal(
		result,

		`
		/** @type {import('svelte/action').Action<HTMLElement, any>} */
        const a = () => {};
		/** @type {import('svelte/action').Action<HTMLDivElement, any>} */
        const b = () => {};
		/** @type {import('svelte/action').Action<HTMLDivElement, true>} */
        const c = () => {};
		/** @type {import('svelte/action').Action<HTMLDivElement, true, {}>} */
        const d = () => {};
		/** @type {import('svelte/action').ActionReturn<any>} */
		const e = () => {};
		/** @type {import('svelte/action').ActionReturn<true>} */
		const f = () => {};
		/** @type {import('svelte/action').ActionReturn<true, {}>} */
		const g = () => {};
        `
	);
});

test('Updates svelte:options #1', () => {
	const result = transform_svelte_code(
		`<svelte:options tag="asd-asd" />
		
		<div>hi</div>`,
		true
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
		
		<div>hi</div>`,
		true
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
		`,
		true
	);
	assert.equal(
		result,
		`<div transition:fade|global />
		<div transition:fade|global={true} />
		<div transition:fade|global></div>
		<div transition:fade />
		<div in:fade|global />
		<div in:fade|global={true} />
		<div in:fade|global></div>
		<div in:fade />
		<div out:fade|global />
		<div out:fade|global={true} />
		<div out:fade|global></div>
		<div out:fade />

		<div transitionn:fade />
		<div allin:fade />
		`
	);
});

test('Updates transitions #2', () => {
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
		`,
		false
	);
	assert.equal(
		result,
		`<div transition:fade />
		<div transition:fade={true} />
		<div transition:fade></div>
		<div transition:fade />
		<div in:fade />
		<div in:fade={true} />
		<div in:fade></div>
		<div in:fade />
		<div out:fade />
		<div out:fade={true} />
		<div out:fade></div>
		<div out:fade />

		<div transitionn:fade />
		<div allin:fade />
		`
	);
});

test('Update package.json', () => {
	const result = update_pkg_json_content(`{
	"name": "svelte-app",
	"version": "1.0.0",
	"devDependencies": {
		"svelte": "^3.0.0",
		"svelte-check": "^1.0.0",
		"svelte-preprocess": "^5.0.0"
	},
	"dependencies": {
		"@sveltejs/kit": "^1.0.0"
	}
}`);
	assert.equal(
		result,
		`{
	"name": "svelte-app",
	"version": "1.0.0",
	"devDependencies": {
		"svelte": "^4.0.0",
		"svelte-check": "^3.4.3",
		"svelte-preprocess": "^5.0.3"
	},
	"dependencies": {
		"@sveltejs/kit": "^1.20.4"
	}
}`
	);
});


test('Does not downgrade versions', () => {
	const result = update_pkg_json_content(`{
	"devDependencies": {
		"svelte": "^4.0.5",
		"typescript": "github:idk"
	}
}`);
	assert.equal(
		result,
		`{
	"devDependencies": {
		"svelte": "^4.0.5",
		"typescript": "github:idk"
	}
}`
	);
});
