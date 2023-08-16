/** @typedef {typeof __propDef.props}  TestProps */
/** @typedef {typeof __propDef.events}  TestEvents */
/** @typedef {typeof __propDef.slots}  TestSlots */
export default class Test extends SvelteComponent<
	{
		foo: boolean;
	},
	{
		[evt: string]: CustomEvent<any>;
	},
	{}
> {}
export type TestProps = typeof __propDef.props;
export type TestEvents = typeof __propDef.events;
export type TestSlots = typeof __propDef.slots;
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
