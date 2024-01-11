/**
 * @typedef {'public' | 'private'} EnvType
 */
/**
 * @param {string} id
 * @param {Record<string, string>} env
 * @returns {string}
 */
export function create_static_module(id: string, env: Record<string, string>): string;
/**
 * @param {EnvType} type
 * @param {Record<string, string> | undefined} dev_values If in a development mode, values to pre-populate the module with.
 */
export function create_dynamic_module(type: EnvType, dev_values: Record<string, string> | undefined): string;
/**
 * @param {EnvType} id
 * @param {import('../types/internal.d.ts').Env} env
 * @returns {string}
 */
export function create_static_types(id: EnvType, env: import('../types/internal.d.ts').Env): string;
/**
 * @param {EnvType} id
 * @param {import('../types/internal.d.ts').Env} env
 * @param {{
 * 	public_prefix: string;
 * 	private_prefix: string;
 * }} prefixes
 * @returns {string}
 */
export function create_dynamic_types(id: EnvType, env: import('../types/internal.d.ts').Env, { public_prefix, private_prefix }: {
    public_prefix: string;
    private_prefix: string;
}): string;
export const reserved: Set<string>;
export const valid_identifier: RegExp;
export type EnvType = 'public' | 'private';
//# sourceMappingURL=env.d.ts.map