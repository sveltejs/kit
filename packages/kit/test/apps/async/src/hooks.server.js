/** @type {import('@sveltejs/kit').HandleValidationError} */
export const handleValidationError = ({ issues }) => {
	return { message: issues[0].message };
};
