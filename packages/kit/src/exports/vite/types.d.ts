import { PrerenderMap } from 'types';

export interface EnforcedConfig {
	[key: string]: EnforcedConfig | true;
}

export interface Analysis {
	prerender_map: PrerenderMap;
	nodes: Array<{ has_server_load: boolean }>;
}
