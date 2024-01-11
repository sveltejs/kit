/**
 * Checks if given id imports a module that is not allowed to be imported into client-side code.
 * @param {string} id
 * @param {{
 *   cwd: string;
 *   node_modules: string;
 *   server: string;
 * }} dirs
 */
export function is_illegal(id: string, dirs: {
    cwd: string;
    node_modules: string;
    server: string;
}): boolean;
/**
 * Creates a guard that checks that no id imports a module that is not allowed to be imported into client-side code.
 * @param {import('vite').Rollup.PluginContext} context
 * @param {{ cwd: string; lib: string }} paths
 */
export function module_guard(context: import('vite').Rollup.PluginContext, { cwd, lib }: {
    cwd: string;
    lib: string;
}): {
    /** @param {string} id should be posixified */
    check: (id: string) => void;
};
/**
 * Removes cwd/lib path from the start of the id
 * @param {string} id
 * @param {string} lib
 * @param {string} cwd
 */
export function normalize_id(id: string, lib: string, cwd: string): string;
//# sourceMappingURL=index.d.ts.map