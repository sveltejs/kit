export const SNAPSHOT_KEY: "sveltekit:snapshot";
export const SCROLL_KEY: "sveltekit:scroll";
export const STATES_KEY: "sveltekit:states";
export const PAGE_URL_KEY: "sveltekit:pageurl";
export const HISTORY_INDEX: "sveltekit:history";
export const NAVIGATION_INDEX: "sveltekit:navigation";
export namespace PRELOAD_PRIORITIES {
    export let tap: 1;
    export let hover: 2;
    export let viewport: 3;
    export let eager: 4;
    export let off: -1;
    let _false: -1;
    export { _false as false };
}
//# sourceMappingURL=constants.d.ts.map