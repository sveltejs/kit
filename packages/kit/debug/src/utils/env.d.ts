/**
 * @param {Record<string, string>} env
 * @param {{
 * 		public_prefix: string;
 * 		private_prefix: string;
 * }} prefixes
 * @returns {Record<string, string>}
 */
export function filter_private_env(env: Record<string, string>, { public_prefix, private_prefix }: {
    public_prefix: string;
    private_prefix: string;
}): Record<string, string>;
/**
 * @param {Record<string, string>} env
 * @param {{
 * 		public_prefix: string;
 *    private_prefix: string;
 * }} prefixes
 * @returns {Record<string, string>}
 */
export function filter_public_env(env: Record<string, string>, { public_prefix, private_prefix }: {
    public_prefix: string;
    private_prefix: string;
}): Record<string, string>;
//# sourceMappingURL=env.d.ts.map