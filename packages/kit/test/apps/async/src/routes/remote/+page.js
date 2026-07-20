import { echo } from './query-command.remote';

export async function load() {
	return {
		echo_result: await echo('Hello world')
	};
}
