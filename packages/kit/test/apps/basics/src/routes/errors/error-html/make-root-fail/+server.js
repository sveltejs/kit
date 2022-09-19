import { set_should_fail } from '../../../+layout.server';

/**
 * @type {import('./$types').RequestHandler} param0
 */
export function GET({ url }) {
	set_should_fail(url.searchParams.get('expected') === 'true' ? 'expected' : 'unexpected');
	return new Response();
}
