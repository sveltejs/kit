/**
 * Generates the manifest data used for the client-side manifest and types generation.
 * @param {{
 *   config: import('../../../types/internal.d.ts').ValidatedConfig;
 *   fallback?: string;
 *   cwd?: string;
 * }} opts
 * @returns {import('../../../types/internal.d.ts').ManifestData}
 */
export default function create_manifest_data({ config, fallback, cwd }: {
    config: import('../../../types/internal.d.ts').ValidatedConfig;
    fallback?: string;
    cwd?: string;
}): import('../../../types/internal.d.ts').ManifestData;
/**
 * @param {import('../../../types/internal.d.ts').ValidatedConfig} config
 */
export function create_assets(config: import('../../../types/internal.d.ts').ValidatedConfig): {
    file: string;
    size: number;
    type: string | null;
}[];
//# sourceMappingURL=index.d.ts.map