/**
 * The sizes of imported assets, which `read` needs before it can respond. A dev server outside
 * the Vite process cannot stat files, so each asset module adds its own size when it loads
 * @type {Record<string, number>}
 */
export const server_assets = {};
