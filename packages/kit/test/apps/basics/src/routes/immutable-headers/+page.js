// This file will trigger the vary-header code-path in `src/runtime/server/respond.js`
export function load() {
	return { foo: 'bar' };
}
