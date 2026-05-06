export class FancyError extends Error {
	name = 'FancyError';
	fancy = true;

	/**
	 * @param {string} message
	 */
	constructor(message) {
		super(message);
	}
}
