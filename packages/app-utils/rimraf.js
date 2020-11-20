const fs = require('fs');

const rm = fs.rm || fs.rmdir;
const [, , ...filenames] = process.argv;
filenames.forEach((filename) =>
	rm(filename, { recursive: true, force: true }, (err) => {
		if (err) {
			throw err;
		}
	})
);
