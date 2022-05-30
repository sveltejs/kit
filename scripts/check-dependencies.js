import { execSync } from 'node:child_process';

const output = execSync('pnpm list --recursive --depth Infinity --json', {
	encoding: 'utf8',
	maxBuffer: 100 * 1024 * 1024
});

const packages = JSON.parse(output);

const deps = new Map();

function get_or_default(map, key, constructor) {
	let current = map.get(key);
	if (!current) {
		map.set(key, (current = new constructor()));
	}
	return current;
}

function add_deps(parent, dependencies, is_dev) {
	for (const [name, { version }] of Object.entries(dependencies)) {
		if (version.startsWith('link:')) continue;
		const versions = get_or_default(deps, name, Map);
		const parents = get_or_default(versions, version, Set);
		parents.add(parent + (is_dev ? ':dev' : ''));
	}
}

for (const pkg of packages) {
	if (pkg.dependencies) add_deps(pkg.name, pkg.dependencies);
	if (pkg.devDependencies) add_deps(pkg.name, pkg.devDependencies, 'dev');
}

const duplicates = new Map([...deps].filter(([, versions]) => versions.size > 1));
console.log(duplicates);
