const fs = require('fs');
const path = require('path');

// recursive copy file to make scripts in package.json cross-platform

function copyRecursiveSync(src, dest) {
	if (fs.existsSync(src) && fs.statSync(src).isDirectory()) {
		fs.mkdirSync(dest, { recursive: true });
		fs.readdirSync(src).forEach(file =>
			copyRecursiveSync(path.join(src, file), path.join(dest, file))
		);
	} else {
		fs.copyFileSync(src, dest);
	}
}

const [, , src, dest] = process.argv;

copyRecursiveSync(src, dest);
