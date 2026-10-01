import { StandardSchemaV1 } from '@standard-schema/spec';

export * from './index.js';

/**
 * [Environment variables](https://svelte.dev/docs/kit/environment-variables) can be configured by exporting
 * a `variables` object from `src/env.ts`, using [`defineEnvVars`](https://svelte.dev/docs/kit/@sveltejs-kit-env#defineEnvVars).
 */
export interface EnvVarConfig<T> {
	/**
	 * Whether the environment variable can be accessed by client-side code.
	 * - if `true`, it can be imported from `$app/env/public`
	 * - if `false`, it can be imported from `$app/env/private`, which is a [server-only module](https://svelte.dev/docs/kit/server-only-modules)
	 * @default false
	 */
	public?: boolean;
	/**
	 * Whether the value is determined at build time or when the app runs.
	 * - if `true`, the build time value is inlined into the bundle. This enables optimisations like dead-code elimination
	 * - if `false`, the value is read from the environment when the app starts
	 * @default false
	 */
	static?: boolean;
	/**
	 * A [Standard Schema](https://standardschema.dev/) validator that is applied to the value when the app starts.
	 * Alternatively, a function that returns the (possibly transformed) value, or throws an error explaining
	 * the problem. Returning `undefined` is valid, so a function can describe an optional variable.
	 * The validator can output any value — not necessarily a string — but public, non-static values must be
	 * serializable by [devalue](https://github.com/sveltejs/devalue) so that they can be sent to the browser.
	 *
	 * If omitted, the value must be set, but may be an empty string.
	 */
	schema?: StandardSchemaV1<string | undefined, T> | ((value: string | undefined) => T | undefined);
	/**
	 * A description of the variable that will be used for inline documentation on hover.
	 */
	description?: string;
}

/**
 * The return type of [`defineEnvVars`](https://svelte.dev/docs/kit/@sveltejs-kit-env#defineEnvVars).
 */
export type DefinedEnvVars<T extends Record<string, EnvVarConfig<any>>> = {
	readonly [K in keyof T]: EnvVarEntry<T[K]>;
};

/**
 * Normalizes an environment variable config's schema (standard schema or function) to standard schema.
 */
type EnvVarEntry<C extends EnvVarConfig<any>> =
	C['schema'] extends StandardSchemaV1<any, any>
		? C
		: C['schema'] extends (value: any) => infer R
			? Omit<C, 'schema'> & { schema: StandardSchemaV1<string | undefined, R> }
			: C;
