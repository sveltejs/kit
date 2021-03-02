import * as crypto from 'crypto';

export function safeBase64Hash(input: string, len?: number) {
	//TODO if performance really matters, use a faster one like xx-hash etc.
	// should be evenly distributed because short input length and similarities in paths could cause collisions otherwise
	const md5 = crypto.createHash('md5');
	md5.update(input);
	const hash = toSafe(md5.digest('base64'));
	return len ? hash.substring(0, len) : hash;
}

const replacements: { [key: string]: string } = {
	'+': '-',
	'/': '_',
	'=': ''
};
const replaceRE = new RegExp(`[${Object.keys(replacements).join('')}]`, 'g');
function toSafe(base64: string) {
	return base64.replace(replaceRE, (x) => replacements[x]);
}
