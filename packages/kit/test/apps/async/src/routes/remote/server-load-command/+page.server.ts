import { do_something } from '../server-action/action.remote';

export async function load() {
	const result = await do_something('test');
	return { result };
}
