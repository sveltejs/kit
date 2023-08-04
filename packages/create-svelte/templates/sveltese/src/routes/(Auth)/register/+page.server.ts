import { fail, redirect } from '@sveltejs/kit'
import { z } from 'zod'
import { message, superValidate } from 'sveltekit-superforms/server'
import { auth } from '$lib/server/lucia'
import { prisma } from '$lib/server/prisma'
// import { emailClient } from '$lib/server/email'
// import { createHash, randomBytes } from 'node:crypto'

const registerSchema = z
	.object({
		name: z.string().min(2, 'Name must be at least 2 characters long.'),
		email: z
			.string()
			.email("Email doesn't look right.")
			.refine(async (email) => {
				if (!email) return true
				const existingEmail = await prisma.authUser.findUnique({
					where: {
						email: email
					}
				})
				return existingEmail ? false : true
			}, 'This email is already in our database.'),
		password: z.string().min(8, 'Password must be at least 8 characters long.'),
		confirmPassword: z.string().min(1, 'Please confirm your password.')
	})
	.refine((data) => data.password === data.confirmPassword, {
		message: "Passwords don't match",
		path: ['password']
	})

export const load = async (event) => {
	const form = await superValidate(event, registerSchema)
	return { form }
}

export const actions = {
	default: async (event) => {
		const form = await superValidate(event, registerSchema)

		if (!form.valid) {
			return fail(400, { form })
		}

		// encrypt password
		// const hash = await createHash('sha256').update(form.data?.password).digest('hex')
		try {
			await auth.createUser({
				primaryKey: {
					providerId: 'email',
					providerUserId: form.data.email,
					password: form.data.password
				},
				attributes: {
					email: form.data.email,
					name: form.data.name
				}
			})
		} catch (error) {
			console.log('error', error)
			return message(form, 'There was an error creating your account.')
		}
		throw redirect(303, '/login')
	}
}
