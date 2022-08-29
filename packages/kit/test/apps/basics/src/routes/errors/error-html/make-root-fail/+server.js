import { set_should_fail } from '../../../+layout.server';

export function GET() {
	set_should_fail(true);
	return new Response();
}
