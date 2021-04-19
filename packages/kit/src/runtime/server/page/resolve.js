/**
 * @param {string} base
 * @param {string} path
 */
export function resolve(base, path) {
	if (path[0] === '/') return path;

	const baseparts = base.slice(1).split('/');
	const pathparts = path.split('/');

	baseparts.pop();

	for (let i = 0; i < pathparts.length; i += 1) {
		const part = pathparts[i];
		if (part === '.') continue;
		else if (part === '..') baseparts.pop();
		else baseparts.push(part);
	}

	return `/${baseparts.join('/')}`;
}
