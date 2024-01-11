/**
 * Runs a task in a subprocess so any dangling stuff gets killed upon completion.
 * The subprocess needs to be the file `forked` is called in, and `forked` needs to be called eagerly at the top level.
 * @template T
 * @template U
 * @param {string} module `import.meta.url` of the file
 * @param {(opts: T) => U} callback The function that is invoked in the subprocess
 * @returns {(opts: T) => Promise<U>} A function that when called starts the subprocess
 */
export function forked<T, U>(module: string, callback: (opts: T) => U): (opts: T) => Promise<U>;
//# sourceMappingURL=fork.d.ts.map