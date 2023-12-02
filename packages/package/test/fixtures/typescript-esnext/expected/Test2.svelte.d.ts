import { SvelteComponent } from 'svelte';
import type { Foo } from './foo';
declare const __propDef: {
	props: {
		foo: Foo;
	};
	events: {
		[evt: string]: CustomEvent<any>;
	};
	slots: {};
};
export type Test2Props = typeof __propDef.props;
export type Test2Events = typeof __propDef.events;
export type Test2Slots = typeof __propDef.slots;
export default class Test2 extends SvelteComponent<Test2Props, Test2Events, Test2Slots> {}
export {};
