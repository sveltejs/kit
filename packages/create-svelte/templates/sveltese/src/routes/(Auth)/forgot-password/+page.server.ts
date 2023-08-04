import { fail } from '@sveltejs/kit'
import { z } from 'zod'
import { message, superValidate } from 'sveltekit-superforms/server'
import { prisma } from '$lib/server/prisma'
import { emailClient } from '$lib/server/email'
import ResetPasswordEmail from '$lib/emails/ResetPasswordEmail.svelte'
import { createHash, randomBytes } from 'node:crypto'

const forgotPasswordSchema = z.object({
	email: z
		.string()
		.email("Email doesn't look right.")
		.refine(async (email) => {
			if (!email) return true
			return await findUserByEmail(email)
		}, 'This email is not in our database.')
})

export const load = async (event) => {
	const form = await superValidate(event, forgotPasswordSchema)
	return { form }
}

async function findUserByEmail(email: string) {
	const user = await prisma.authUser.findUnique({
		where: {
			email: email
		}
	})
	console.log(user)

	return user || false
}

export const actions = {
	default: async (event) => {
		const form = await superValidate(event, forgotPasswordSchema)

		if (!form.valid) {
			console.log('invalid formx')
			return fail(400, { form })
		}

		const user = await findUserByEmail(form.data.email.toLocaleLowerCase())
		if (!user) {
			const error = 'User not found.'
			console.log(error)
			return message(form, 'No user found with that email.')
		}

		const token = randomBytes(32).toString('hex')
		const hashedToken = createHash('sha256').update(token).digest('hex')

		const result = await prisma.password_reset_tokens.upsert({
			where: {
				email: user.email
			},
			update: {
				token: hashedToken
			},
			create: {
				email: user.email,
				token: hashedToken
			}
		})

		console.log(result)

		const tokenExpiry = new Date(Date.now() + 1000 * 60 * 60 * 24 * 3).toISOString()
		console.log(token, tokenExpiry)

		// TODO: Come up with an email system that can use tailwindcss
		// eslint-disable-next-line @typescript-eslint/no-var-requires
		const { head, html, css } = ResetPasswordEmail.render({
			token: token,
			email: user.email
		})

		const messagex = {
			from: 'Nodemailer <example@nodemailer.com>',
			to: 'Nodemailer <example@nodemailer.com>',
			subject: 'AMP4EMAIL message',
			text: 'For clients with plaintext support only',
			html: html + ' <style>' + css.code + '</style>'
		}

		emailClient.sendMail(messagex, function (err, info) {
			if (err) {
				console.log(err)
			} else {
				console.log(info)
			}
		})

		return message(form, "We've sent you an email with a link to reset your password.")
	}
}
