export class Foo {
	/** @param {string} message */
	constructor(message) {
		this.message = message;
	}

	bar() {
		return this.message + '!';
	}
}
