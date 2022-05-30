import fs from 'node:fs';
import glob from 'tiny-glob/sync.js';

const maps = {
	dependencies: new Map(),
	devDependencies: new Map()
};

for (const file of glob('**/package.json', )) {
	if (file.includes('node_modules')) continue;

	const pkg = JSON.parse(fs.readFileSync(file, 'utf-8'));

	for (const type of ['dependencies', 'devDependencies']) {
		for (const name in pkg[type]) {
			const version = pkg[type][name];
			if (version === 'workspace:*') continue;

			if (!maps[type].has(name)) maps[type].set(name, new Map());
			if (!maps[type].get(name).has(version)) maps[type].get(name).set(version, []);
			maps[type].get(name).get(version).push(file);
		}
	}
}

for (const type of ['dependencies', 'devDependencies']) {
	for (const [name, map] of maps[type]) {
		if (map.size > 1) {
			console.log(name, map);
		}
	}
}