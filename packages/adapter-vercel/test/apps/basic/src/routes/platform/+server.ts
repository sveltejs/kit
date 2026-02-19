import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = (event) => {
	return json({
		has_platform: !!event.platform
	});
};
