const { writeFileSync } = require('fs');
const { join } = require('path');
const glob = require('tiny-glob/sync');
const template_pkg = require('../template/package.json');

const cwd = join(__dirname, '../../');
const pkgs = glob('*/package.json', { cwd }).map(file => require(`${cwd}/${file}`));

const versions = {};

[template_pkg.dependencies, template_pkg.devDependencies].forEach(deps => {
	for (const key in deps) {
		const value = deps[key];
		console.log(key, value);
		if (value.startsWith('workspace:')) {
			const pkg = pkgs.find(pkg => pkg.name === key);
			if (pkg) {
				versions[key] = pkg.version;
			}
		}
	}
});

console.log(versions);

writeFileSync(join(__dirname, '../cli/versions.js'), `export default ${JSON.stringify(versions, null, '\t')};`)