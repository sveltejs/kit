import { query_map } from '../../client.js';
import { CacheController } from '../cache.svelte.js';

export const cache = new CacheController(query_map);
