import { SvelteComponent } from 'svelte';
import './css/global.css';
declare const __propDef: {
	props: {
		bar?: import('./sub/foo').Foo;
	};
	events: {
		[evt: string]: CustomEvent<any>;
	};
	slots: {};
};
export type TestProps = typeof __propDef.props;
export type TestEvents = typeof __propDef.events;
export type TestSlots = typeof __propDef.slots;
export default class Test extends SvelteComponent<TestProps, TestEvents, TestSlots> {}
export {};
