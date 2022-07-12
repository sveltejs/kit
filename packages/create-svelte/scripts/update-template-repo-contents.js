import fs from 'fs';
import path from 'path';
import { create } from '../index.js';

const repo = process.argv[2];

fs.readdirSync(repo).forEach((file) => {
	if (file !== '.git') {
		fs.rmSync(path.join(repo, file), {
			recursive: true,
			force: true
		});
	}
});

await create(repo, {
	name: 'kit-template-default',
	template: 'default',
	eslint: false,
	types: 'checkjs',
	prettier: true,
	playwright: false
});
