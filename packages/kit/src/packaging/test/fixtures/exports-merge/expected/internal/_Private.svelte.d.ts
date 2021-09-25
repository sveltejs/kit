/** @typedef {typeof __propDef.props}  PrivateProps */
/** @typedef {typeof __propDef.events}  PrivateEvents */
/** @typedef {typeof __propDef.slots}  PrivateSlots */
export default class Private extends SvelteComponentTyped<{}, {
	[evt: string]: CustomEvent<any>;
},
{}
> {
}
export type PrivateProps = typeof __propDef.props;
export type PrivateEvents = typeof __propDef.events;
export type PrivateSlots = typeof __propDef.slots;
import { SvelteComponentTyped } from "svelte";
declare const __propDef: {
	props: {};
	events: {
		[evt: string]: CustomEvent<any>;
	};
	slots: {};
};
export {};
