declare module "$app/navigation/types" {
    export interface HydratedTarget {
        redirect?: Redirect;
        preload_error?: any;
        props: any;
        branch: Branch;
    }
    export type Branch = Array<{
        segment: string;
        match?: RegExpExecArray;
        component?: any;
        part?: number;
    }>;
    export type InitialData = {
        session: any;
        preloaded?: object[];
        status: number;
        error: Error;
        baseUrl: string;
    };
    export interface ScrollPosition {
        x: number;
        y: number;
    }
    export interface Target {
        href: string;
        route: any;
        match: RegExpExecArray;
        page: Page;
    }
    export interface Redirect {
        statusCode: number;
        location: string;
    }
    export interface Page {
        host: string;
        path: string;
        params: Record<string, string>;
        query: Record<string, string | string[]>;
    }
}
declare module "$app/navigation/utils" {
    export function get_base_uri(window_document: any): any;
    export function find_anchor(node: Node): Node;
}
declare module "$app/navigation/internal" {
    import { ScrollPosition, Target } from "$app/navigation/types";
    export let uid: number;
    export function set_uid(n: number): void;
    export let cid: number;
    export function set_cid(n: number): void;
    const _history: History;
    export { _history as history };
    export const scroll_history: Record<string, ScrollPosition>;
    export function load_current_page(): Promise<void>;
    export function init(base: string, handler: (dest: Target) => Promise<void>): void;
    export function extract_query(search: string): any;
    export function select_target(url: URL): Target;
    export function navigate(dest: Target, id: number, noscroll?: boolean, hash?: string): Promise<void>;
}
declare module "$app/navigation/goto/index" {
    export default function goto(href: string, opts?: {
        noscroll?: boolean;
        replaceState?: boolean;
    }): Promise<void>;
}
declare module "$app/navigation/start/page_store" {
    import { Readable } from 'svelte/store';
    /** Writable interface for both updating and subscribing. */
    interface PageStore<T> extends Readable<T> {
        /**
         * Inform subscribers.
         */
        notify(): void;
        /**
         * Set value without informing subscribers.
         * @param value to set
         */
        set(value: T): void;
    }
    export function page_store<T>(value: T): PageStore<T>;
}
declare module "$app/navigation/start/index" {
    import { HydratedTarget, Target, InitialData } from "$app/navigation/types";
    export const initial_data: InitialData;
    export let target: Node;
    export function set_target(node: Node): void;
    export default function start(opts: {
        target: Node;
    }): Promise<void>;
    export function hydrate_target(dest: Target): Promise<HydratedTarget>;
}
declare module "$app/navigation/prefetch/index" {
    import { HydratedTarget, Target } from "$app/navigation/types";
    export function start(): void;
    export default function prefetch(href: string): Promise<HydratedTarget>;
    export function get_prefetched(target: Target): Promise<HydratedTarget>;
}
declare module "$app/navigation/prefetchRoutes/index" {
    export default function prefetchRoutes(pathnames: string[]): Promise<void>;
}
declare module "$app/navigation/index" {
    export { default as goto } from "$app/navigation/goto/index";
    export { default as prefetch } from "$app/navigation/prefetch/index";
    export { default as prefetchRoutes } from "$app/navigation/prefetchRoutes/index";
    export { default as start } from "$app/navigation/start/index";
}
declare module "$app/stores/index" {
    export const getStores: () => {
        page: any;
        preloading: any;
        session: any;
    };
    export const page: {
        subscribe(fn: any): any;
    };
    export const preloading: {
        subscribe(fn: any): any;
    };
    export const session: {
        subscribe(fn: any): any;
        set: () => never;
        update: () => never;
    };
}
