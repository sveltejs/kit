import fs from 'fs';
import path from 'path';
import { runner } from '../../../runner'; // TODO make this a package?

runner((test, is_dev) => {
	const dir = path.join(__dirname, 'tests');
	const modules = fs.readdirSync(dir);
	for (const module of modules) {
		require(`./tests/${module}`).default(test, is_dev);
	}
});
