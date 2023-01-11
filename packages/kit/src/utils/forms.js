/**
 * Consistently returns the form method without inputs overriding the method attribute.
 * @param {HTMLFormElement} form
 */
export function getFormMethod(form) {
	return form.getAttribute('method')?.toLowerCase() === 'post' ? 'post' : 'get';
}
