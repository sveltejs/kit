import os from 'os';

export function get() {
	return {
		body: typeof os.arch()
	};
}
