export class Foo {
	/**
	 * @param {string} message
	 * @param {{ id: number }} [call] the remote call the value was decoded from, if any
	 */
	constructor(message, call) {
		this.message = message;
		this.call = call;
	}

	bar() {
		return this.message + '!';
	}
}
