/**
 * @typedef {{
 *   fn: () => Promise<any>,
 *   fulfil: (value: any) => void,
 *   reject: (error: Error) => void
 * }} Task
 */
/** @param {number} concurrency */
export function queue(concurrency: number): {
    /** @param {() => any} fn */
    add: (fn: () => any) => Promise<any>;
    done: () => Promise<any>;
};
export type Task = {
    fn: () => Promise<any>;
    fulfil: (value: any) => void;
    reject: (error: Error) => void;
};
//# sourceMappingURL=queue.d.ts.map