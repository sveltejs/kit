/** @typedef {typeof __propDef.props}  TestProps */
/** @typedef {typeof __propDef.events}  TestEvents */
/** @typedef {typeof __propDef.slots}  TestSlots */
export default class Test extends SvelteComponent<
	{
		astring?: string;
	},
	{
		event: CustomEvent<any>;
	} & {
		[evt: string]: CustomEvent<any>;
	},
	{
		default: {
			astring: string;
		};
	}
> {
	get astring(): string;
}
export type TestProps = typeof __propDef.props;
export type TestEvents = typeof __propDef.events;
export type TestSlots = typeof __propDef.slots;
import { SvelteComponent } from 'svelte';
declare const __propDef: {
	props: {
		astring?: string;
	};
	events: {
		event: CustomEvent<any>;
	} & {
		[evt: string]: CustomEvent<any>;
	};
	slots: {
		default: {
			astring: string;
		};
	};
};
export {};
