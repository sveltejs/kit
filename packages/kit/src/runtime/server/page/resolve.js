/**
 * @param {string} base
 * @param {string} path
 */
export function resolve(base, path) {
	const baseparts = path[0] === '/' ? [] : base.slice(1).split('/');
	const pathparts = path[0] === '/' ? path.slice(1).split('/') : path.split('/');

	baseparts.pop();

	for (let i = 0; i < pathparts.length; i += 1) {
		const part = pathparts[i];
		if (part === '.') continue;
		else if (part === '..') baseparts.pop();
		else baseparts.push(part);
	}

	return `/${baseparts.join('/')}`;
}
