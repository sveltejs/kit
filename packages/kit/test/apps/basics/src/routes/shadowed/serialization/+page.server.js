class Nope {
	toString() {
		return 'should not see me';
	}
}

export function load() {
	return {
		nope: new Nope()
	};
}
