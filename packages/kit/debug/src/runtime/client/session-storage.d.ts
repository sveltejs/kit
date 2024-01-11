/**
 * Read a value from `sessionStorage`
 * @param {string} key
 * @param {(value: string) => any} parse
 */
export function get(key: string, parse?: (value: string) => any): any;
/**
 * Write a value to `sessionStorage`
 * @param {string} key
 * @param {any} value
 * @param {(value: any) => string} stringify
 */
export function set(key: string, value: any, stringify?: (value: any) => string): void;
//# sourceMappingURL=session-storage.d.ts.map