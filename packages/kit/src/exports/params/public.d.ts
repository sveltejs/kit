import { StandardSchemaV1 } from '@standard-schema/spec';

/**
 * The shape of a param matcher. See [matching](https://svelte.dev/docs/kit/advanced-routing#Matching) for more info.
 */
export type ParamMatcher<Output = any> = StandardSchemaV1<string, Output>;

/**
 * A value that can be parsed from a URL param and losslessly encoded with `String(...)`.
 */
export type ParamValue = string | number | boolean | bigint;

/**
 * A param matcher definition passed to [`defineParams`](https://svelte.dev/docs/kit/@sveltejs-kit-params#defineParams).
 */
export type ParamDefinition =
	| ((param: string) => ParamValue | undefined)
	| StandardSchemaV1<string, ParamValue>;

/**
 * The return type of [`defineParams`](https://svelte.dev/docs/kit/@sveltejs-kit-params#defineParams).
 */
export type DefinedParams<T extends Record<string, ParamDefinition>> = {
	readonly [K in keyof T]: ParamEntry<T[K]>;
};

/**
 * Normalizes a property of defineParams (schema or function) to standard schema.
 */
type ParamEntry<M> =
	M extends StandardSchemaV1<any, any>
		? StandardSchemaV1.InferOutput<M> extends ParamValue
			? StandardSchemaV1<any, M>
			: StandardSchemaV1<any, never>
		: M extends (param: string) => infer R
			? Exclude<R, undefined> extends ParamValue
				? StandardSchemaV1<any, Exclude<R, undefined>>
				: StandardSchemaV1<any, never>
			: never;

/**
 * Extracts the param type from a matcher.
 */
export type MatcherParam<M extends StandardSchemaV1<any, any>> =
	M extends StandardSchemaV1<any, infer Inner>
		? Inner extends ParamValue
			? Inner
			: Inner extends StandardSchemaV1<any, any>
				? StandardSchemaV1.InferOutput<Inner> extends ParamValue
					? StandardSchemaV1.InferOutput<Inner>
					: never
				: never
		: never;

/**
 * Define [parameter matchers](https://svelte.dev/docs/kit/advanced-routing#Matching) for your app.
 *
 * @template T
 * @param definitions
 */
export function defineParams<T extends Record<string, ParamDefinition>>(
	definitions: T
): DefinedParams<T>;
