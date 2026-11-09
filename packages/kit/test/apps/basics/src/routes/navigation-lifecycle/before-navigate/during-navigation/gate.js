function hold() {
	/** @type {() => void} */
	let release = () => {};
	/** @type {Promise<void>} */
	const released = new Promise((fulfil) => (release = () => fulfil(undefined)));
	return { release, released };
}

/** The load of `b` waits for this until the test releases it */
export const b = hold();

/** `onNavigate` holds the navigation to `c` on this until the test releases it */
export const c = hold();
