export function get() {
	return {
		headers: {
			'set-cookie': [
				'x=y',
				'current_wish=fix, this, stuff; HttpOnly; Secure',
				'foo=bar; SameSite=Lax'
			]
		}
	};
}

export function post() {
	return {
		headers: {
			'set-cookie': [
				'post_x=y',
				'post_current_wish=fix, this, stuff; HttpOnly; Secure',
				'post_foo=bar; SameSite=Lax'
			]
		}
	};
}
