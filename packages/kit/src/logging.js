import { bold, gray, red, yellow } from 'kleur/colors';
import pms from 'pretty-ms';

const DEBUG = !!process.env.DEBUG;

export const log = {
	info: (msg) => {
		console.log(msg);
	},
	minor: (msg) => {
		console.log(gray(msg));
	},
	warn: (msg) => {
		console.log(bold(yellow(msg)));
	},
	error: (msg) => {
		console.log(bold(red(msg)));
	},
	debug: (msg) => {
		if (DEBUG) console.log(msg);
	}
};

export function timer() {
	const start = Date.now();
	return () => {
		const elapsed = Date.now() - start;
		return {
			valueOf: () => elapsed,
			toString: () => pms(elapsed)
		};
	};
}
