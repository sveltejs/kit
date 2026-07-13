/** @param {any} error */
export let fix_stack_trace = (error) => error?.stack;

/** @param {(error: Error) => string} value */
export function set_fix_stack_trace(value) {
	fix_stack_trace = value;
}
