import { query } from '$app/server';

export const get_server_load_data = query(() => {
	return { message: 'from server load', secret: 'server-load-secret' };
});

export const get_universal_load_data = query(() => 'from universal load');

export const get_component_data = query(() => 'from component');
