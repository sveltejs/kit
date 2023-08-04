import Welcome__SvelteComponent_ from '$lib/emails/Welcome.svelte'
import { emailClient } from '$lib/server/email'
import { render } from 'svelte-email'
import { redirect } from '@sveltejs/kit'

const emailHtml = render({
	template: Welcome__SvelteComponent_,
	props: {
		firstName: 'Sveltese'
	}
})

const options = {
	from: 'Sveltese <noreply@localhost>',
	to: 'noreply@localhost',
	subject: 'Welcome to Sveltese',
	html: emailHtml
}

export async function GET() {
	await emailClient.sendMail(options)
	throw redirect(302, '/')
}
