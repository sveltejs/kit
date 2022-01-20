import fs from 'fs';
import path from 'path';
import { create } from '../index.js';

const tmp = process.argv[2];
const repo = path.join(tmp, 'kit-template-default');

fs.readdirSync(repo).forEach((file) => {
	if (file !== '.git') {
		fs.rmSync(path.join(repo, file), {
			recursive: true,
			force: true
		});
	}
});

await create(repo, {
	template: 'default',
	eslint: false,
	typescript: false,
	prettier: true
});
