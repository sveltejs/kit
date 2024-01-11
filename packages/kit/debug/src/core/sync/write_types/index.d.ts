/**
 * Creates types for the whole manifest
 * @param {import('../../../types/internal.d.ts').ValidatedConfig} config
 * @param {import('../../../types/internal.d.ts').ManifestData} manifest_data
 */
export function write_all_types(config: import('../../../types/internal.d.ts').ValidatedConfig, manifest_data: import('../../../types/internal.d.ts').ManifestData): Promise<void>;
/**
 * Creates types related to the given file. This should only be called
 * if the file in question was edited, not if it was created/deleted/moved.
 * @param {import('../../../types/internal.d.ts').ValidatedConfig} config
 * @param {import('../../../types/internal.d.ts').ManifestData} manifest_data
 * @param {string} file
 */
export function write_types(config: import('../../../types/internal.d.ts').ValidatedConfig, manifest_data: import('../../../types/internal.d.ts').ManifestData, file: string): Promise<void>;
/**
 * @param {string} content
 * @param {boolean} is_server
 * @returns {Omit<NonNullable<Proxy>, 'file_name'> | null}
 */
export function tweak_types(content: string, is_server: boolean): Omit<NonNullable<Proxy>, 'file_name'> | null;
export type Proxy = {
    file_name: string;
    modified: boolean;
    code: string;
    exports: any[];
} | null;
export type Proxies = {
    server: Proxy;
    universal: Proxy;
};
export type RoutesMap = Map<import('../../../types/internal.d.ts').PageNode, {
    route: import('../../../types/internal.d.ts').RouteData;
    proxies: Proxies;
}>;
//# sourceMappingURL=index.d.ts.map