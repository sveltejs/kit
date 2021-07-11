import { SvelteComponentTyped } from 'svelte';
declare const __propDef: {
	props: {
		astring: string;
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
export declare type TestProps = typeof __propDef.props;
export declare type TestEvents = typeof __propDef.events;
export declare type TestSlots = typeof __propDef.slots;
export default class Test extends SvelteComponentTyped<TestProps, TestEvents, TestSlots> {
	get astring(): string;
}
export {};
