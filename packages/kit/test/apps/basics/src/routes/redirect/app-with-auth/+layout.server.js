export async function load({ cookies }) {
	return {
		loggedIn: cookies.get('logged_in') === '1'
	};
}
