import { redirect } from '@sveltejs/kit'

export const load = async (event) => {
	const session = await event.locals.auth.validate()
	if (!session) {
		throw redirect(303, '/login')
	}

	const { user } = await event.locals.auth.validateUser()

	return {
		user
	}
}
