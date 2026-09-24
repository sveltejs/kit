import { SvelteComponentTyped } from 'svelte';
declare const __propDef: {
	props: {
		label?: string;
	};
	events: {
		[evt: string]: CustomEvent<any>;
	};
	slots: {};
};
export type ProbeProps = typeof __propDef.props;
export type ProbeEvents = typeof __propDef.events;
export type ProbeSlots = typeof __propDef.slots;
export default class Probe extends SvelteComponentTyped<ProbeProps, ProbeEvents, ProbeSlots> {}
export {};
