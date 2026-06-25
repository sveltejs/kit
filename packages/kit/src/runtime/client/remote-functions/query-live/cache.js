import { live_query_map } from '../../client.js';
import { CacheController } from '../cache.svelte.js';

export const cache = new CacheController(live_query_map, (resource) => resource.destroy());
