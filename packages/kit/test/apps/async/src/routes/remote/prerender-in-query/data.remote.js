import { query } from '$app/server';
import { prerendered } from '../prerender/prerender.remote';

// `prerendered` throws at runtime in prod, so this must be served from the prerendered response
export const nested = query(() => prerendered());
