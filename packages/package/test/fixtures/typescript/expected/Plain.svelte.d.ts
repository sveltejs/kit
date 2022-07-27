/** @typedef {typeof __propDef.props}  PlainProps */
/** @typedef {typeof __propDef.events}  PlainEvents */
/** @typedef {typeof __propDef.slots}  PlainSlots */
export default class Plain extends SvelteComponentTyped<
	{
		foo: boolean;
	},
	{
		[evt: string]: CustomEvent<any>;
	},
	{}
> {}
export type PlainProps = typeof __propDef.props;
export type PlainEvents = typeof __propDef.events;
export type PlainSlots = typeof __propDef.slots;
import { SvelteComponentTyped } from 'svelte';
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
