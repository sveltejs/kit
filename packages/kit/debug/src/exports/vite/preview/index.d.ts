/** @typedef {import('http').IncomingMessage} Req */
/** @typedef {import('http').ServerResponse} Res */
/** @typedef {(req: Req, res: Res, next: () => void) => void} Handler */
/**
 * @param {{ middlewares: import('connect').Server }} vite
 * @param {import('vite').ResolvedConfig} vite_config
 * @param {import('../../../types/internal.d.ts').ValidatedConfig} svelte_config
 */
export function preview(vite: {
    middlewares: import('connect').Server;
}, vite_config: import('vite').ResolvedConfig, svelte_config: import('../../../types/internal.d.ts').ValidatedConfig): Promise<() => void>;
export type Req = import('http').IncomingMessage;
export type Res = import('http').ServerResponse;
export type Handler = (req: Req, res: Res, next: () => void) => void;
//# sourceMappingURL=index.d.ts.map