import { echo } from './query-command.remote';

/** @type {import('./$types').PageLoad} */
export async function load() {
	const echo_query = echo('Hello world');

	return {
		echo_result: await echo_query.run(),
		echo_argument: echo_query.argument
	};
}
