/**
 * Creates the Builder which is passed to adapters for building the application.
 * @param {{
 *   config: import('../../types/internal.d.ts').ValidatedConfig;
 *   build_data: import('../../types/internal.d.ts').BuildData;
 *   server_metadata: import('../../types/internal.d.ts').ServerMetadata;
 *   route_data: import('../../types/internal.d.ts').RouteData[];
 *   prerendered: import('../../types/internal.d.ts').Prerendered;
 *   prerender_map: import('../../types/internal.d.ts').PrerenderMap;
 *   log: import('../../types/internal.d.ts').Logger;
 *   vite_config: import('vite').ResolvedConfig;
 * }} opts
 * @returns {import('@sveltejs/kit').Builder}
 */
export function create_builder({ config, build_data, server_metadata, route_data, prerendered, prerender_map, log, vite_config }: {
    config: import('../../types/internal.d.ts').ValidatedConfig;
    build_data: import('../../types/internal.d.ts').BuildData;
    server_metadata: import('../../types/internal.d.ts').ServerMetadata;
    route_data: import('../../types/internal.d.ts').RouteData[];
    prerendered: import('../../types/internal.d.ts').Prerendered;
    prerender_map: import('../../types/internal.d.ts').PrerenderMap;
    log: import('../../types/internal.d.ts').Logger;
    vite_config: import('vite').ResolvedConfig;
}): import('@sveltejs/kit').Builder;
//# sourceMappingURL=builder.d.ts.map