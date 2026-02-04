// pnpm captures stdout and prefixes it with the package name which breaks the annotations
// so save it in a file and print it out at the end
// ideally we'd just use cat, but that doesn't work on Windows hence this script

import { existsSync, createReadStream, unlinkSync } from 'node:fs';
const filename = '_tmp_flaky_test_output.txt';

if (existsSync(filename)) {
	createReadStream(filename)
		.on('end', () => {
			process.stdout.write('\n');
			unlinkSync(filename);
		})
		.pipe(process.stdout);
}
