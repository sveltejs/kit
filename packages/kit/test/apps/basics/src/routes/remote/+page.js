import { q } from './accessing-env.remote';
import { echo } from './query-command.remote';

export async function load() {
	q();
	return {
		echo_result: await echo('Hello world')
	};
}
