/**
 * @param {import('./types.js').SvelteKitApp} app
 * @param {HTMLElement} target
 * @param {Parameters<import('./types.js').Client['_hydrate']>[0]} [hydrate]
 */
export function start(app: import('./types.js').SvelteKitApp, target: HTMLElement, hydrate?: {
    status: number;
    error: App.Error | null;
    node_ids: number[];
    params: Record<string, string>;
    route: {
        id: string | null;
    };
    data: (import("../../types/internal.js").ServerDataNode | null)[];
    form: Record<string, any> | null;
} | undefined): Promise<void>;
//# sourceMappingURL=start.d.ts.map