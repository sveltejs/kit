import * as e from '../../messages/build-errors.js';

/** @type {typeof import('typescript')} */
// @ts-ignore
export let ts = undefined;
try {
	ts = (await import('typescript')).default;
} catch {
	// TypeScript is an optional peer dependency.
}

// TypeScript 7 imports successfully, but no longer provides the JavaScript compiler API.
// Keep this outside the catch so an incompatible installation is not treated as an absent one.
if (ts && typeof ts.createSourceFile !== 'function') {
	e.typescript_compiler_api_missing({ version: ts.version }, { stackless: true });
}
