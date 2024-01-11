/// <reference types="svelte" />
/** @param {string | URL} url */
export function resolve_url(url: string | URL): URL;
export function scroll_state(): {
    x: number;
    y: number;
};
/**
 * @param {Element} element
 * @param {Element} target
 */
export function find_anchor(element: Element, target: Element): HTMLAnchorElement | SVGAElement | undefined;
/**
 * @param {HTMLAnchorElement | SVGAElement} a
 * @param {string} base
 */
export function get_link_info(a: HTMLAnchorElement | SVGAElement, base: string): {
    url: URL | undefined;
    external: boolean;
    target: string;
    download: boolean;
};
/**
 * @param {HTMLFormElement | HTMLAnchorElement | SVGAElement} element
 */
export function get_router_options(element: HTMLFormElement | HTMLAnchorElement | SVGAElement): {
    preload_code: 2 | 1 | 3 | 4 | -1;
    preload_data: 2 | 1 | -1;
    keepfocus: boolean | undefined;
    noscroll: boolean | undefined;
    reload: boolean | undefined;
    replace_state: boolean | undefined;
};
/** @param {any} value */
export function notifiable_store(value: any): {
    notify: () => void;
    set: (new_value: any) => void;
    subscribe: (run: (value: any) => void) => import("svelte/store").Unsubscriber;
};
export function create_updated_store(): {
    subscribe: (this: void, run: import("svelte/store").Subscriber<boolean>, invalidate?: import("svelte/store").Invalidator<boolean> | undefined) => import("svelte/store").Unsubscriber;
    check: () => Promise<boolean>;
};
/**
 * @param {URL} url
 * @param {string} base
 */
export function is_external_url(url: URL, base: string): boolean;
export const origin: string;
export type ValidLinkOptions<T extends "reload" | "preload-code" | "preload-data" | "keepfocus" | "noscroll" | "replacestate"> = (typeof valid_link_options)[T][number];
export type LinkOptionName = keyof typeof valid_link_options;
/** @typedef {keyof typeof valid_link_options} LinkOptionName */
declare const valid_link_options: {
    readonly 'preload-code': readonly ["", "off", "false", "tap", "hover", "viewport", "eager"];
    readonly 'preload-data': readonly ["", "off", "false", "tap", "hover"];
    readonly keepfocus: readonly ["", "true", "off", "false"];
    readonly noscroll: readonly ["", "true", "off", "false"];
    readonly reload: readonly ["", "true", "off", "false"];
    readonly replacestate: readonly ["", "true", "off", "false"];
};
export {};
//# sourceMappingURL=utils.d.ts.map