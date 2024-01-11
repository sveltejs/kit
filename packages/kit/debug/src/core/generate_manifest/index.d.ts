/**
 * Generates the data used to write the server-side manifest.js file. This data is used in the Vite
 * build process, to power routing, etc.
 * @param {{
 *   build_data: import('../../types/internal.d.ts').BuildData;
 *   relative_path: string;
 *   routes: import('../../types/internal.d.ts').RouteData[];
 * }} opts
 */
export function generate_manifest({ build_data, relative_path, routes }: {
    build_data: import('../../types/internal.d.ts').BuildData;
    relative_path: string;
    routes: import('../../types/internal.d.ts').RouteData[];
}): string;
//# sourceMappingURL=index.d.ts.map