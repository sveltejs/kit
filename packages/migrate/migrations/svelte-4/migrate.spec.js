import { test } from 'uvu';
import * as assert from 'uvu/assert';
import { transform_code } from './migrate.js';

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

test.run();
