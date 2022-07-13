import { SvelteComponentTyped } from "svelte";
declare const __propDef: {
    props: {
        answer: number;
    };
    events: {
        [evt: string]: CustomEvent<any>;
    };
    slots: {};
};
export declare type TestProps = typeof __propDef.props;
export declare type TestEvents = typeof __propDef.events;
export declare type TestSlots = typeof __propDef.slots;
export default class Test extends SvelteComponentTyped<TestProps, TestEvents, TestSlots> {
}
export {};
