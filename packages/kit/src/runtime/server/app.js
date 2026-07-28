/** @typedef {{ decoders: Record<string, (data: any) => any>, encoders: Record<string, (value: any) => any> }} App */

/** @type {App} */
export let app;

/**
 * @param {App} value
 */
export function set_app(value) {
	app = value;
}
