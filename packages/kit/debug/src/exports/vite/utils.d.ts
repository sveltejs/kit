/**
 * Transforms kit.alias to a valid vite.resolve.alias array.
 *
 * Related to tsconfig path alias creation.
 *
 * @param {import('../../types/internal.d.ts').ValidatedKitConfig} config
 * */
export function get_config_aliases(config: import('../../types/internal.d.ts').ValidatedKitConfig): import("vite").Alias[];
/**
 * Load environment variables from process.env and .env files
 * @param {import('../../types/internal.d.ts').ValidatedKitConfig['env']} env_config
 * @param {string} mode
 */
export function get_env(env_config: import('../../types/internal.d.ts').ValidatedKitConfig['env'], mode: string): {
    public: Record<string, string>;
    private: Record<string, string>;
};
/**
 * @param {import('http').IncomingMessage} req
 * @param {import('http').ServerResponse} res
 * @param {string} base
 */
export function not_found(req: import('http').IncomingMessage, res: import('http').ServerResponse, base: string): void;
export function strip_virtual_prefix(id: string): string;
//# sourceMappingURL=utils.d.ts.map