export class FancyError extends Error {
	name = 'FancyError';
	fancy = true;

	constructor(message, options) {
		super(message, options);
	}
}
