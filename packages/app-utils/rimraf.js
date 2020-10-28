const fs = require('fs');

(fs.rm || fs.rmdir)(process.argv[2], { recursive: true, force: true }, err => {
	if (err) {
		throw err;
	}
});
