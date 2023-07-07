/** @typedef {typeof __propDef.props}  Test2Props */
/** @typedef {typeof __propDef.events}  Test2Events */
/** @typedef {typeof __propDef.slots}  Test2Slots */
export default class Test2 extends SvelteComponent<
	{
		foo: boolean;
	},
	{
		[evt: string]: CustomEvent<any>;
	},
	{}
> {}
export type Test2Props = typeof __propDef.props;
export type Test2Events = typeof __propDef.events;
export type Test2Slots = typeof __propDef.slots;
import { SvelteComponent } from 'svelte';
declare const __propDef: {
	props: {
		foo: import('./foo').Foo;
	};
	events: {
		[evt: string]: CustomEvent<any>;
	};
	slots: {};
};
export {};
