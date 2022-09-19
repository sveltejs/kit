import { set_should_fail } from '../../../+layout.server';

/**
 * @type {import('./$types').RequestHandler} param0
 */
export function GET({ url }) {
	set_should_fail(url.searchParams.get('type'));
	return new Response();
}
