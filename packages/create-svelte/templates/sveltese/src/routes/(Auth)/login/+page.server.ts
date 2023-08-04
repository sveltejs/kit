import { fail, redirect } from '@sveltejs/kit'
import { z } from 'zod'
import { message, superValidate } from 'sveltekit-superforms/server'
import { auth } from '$lib/server/lucia'
import { createHash, randomBytes } from 'node:crypto'

const loginSchema = z.object({
	email: z.string().email("Email doesn't look right."),
	password: z.string().min(8, 'Password must be at least 8 characters.'),
	remember: z.boolean().default(false).optional()
})

export const load = async (event) => {
	const form = await superValidate(event, loginSchema)
	return { form }
}

export const actions = {
	default: async (event) => {
		const form = await superValidate(event, loginSchema)

		if (!form.valid) {
			return fail(400, { form })
		}

		try {
			const email = form.data.email.toLocaleLowerCase()
			const password = form.data.password
			// const hash = await createHash('sha256').update(form.data?.password).digest('hex')
			const key = await auth.useKey('email', email, password)
			const session = await auth.createSession(key.userId)
			event.locals.auth.setSession(session)
		} catch (err) {
			return message(form, 'Login was unsuccessful.')
		}
		throw redirect(303, '/dashboard')
	}
}
