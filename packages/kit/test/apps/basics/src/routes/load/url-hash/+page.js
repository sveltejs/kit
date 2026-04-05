/** @type {import("./$types").PageLoad} */
export const load = ({ url }) => {
	const hash = url.hash;
	return { hash };
};
