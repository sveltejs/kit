// pnpm captures stdout and prefixes it with the package name which breaks the annotations
// so save it in a file and print it out at the end

import fs from 'fs';
const filename = '_tmp_flaky_test_output.txt';

if (fs.existsSync(filename)) {
	const stream = fs.createReadStream(filename);
	stream.pipe(process.stdout);
	stream.on('end', () => {
		fs.unlinkSync(filename);
	});
    process.stdout.write('\n');
}
