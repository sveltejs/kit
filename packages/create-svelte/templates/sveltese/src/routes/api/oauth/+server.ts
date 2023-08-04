import type { RequestHandler } from './$types'
import { githubAuth } from '$lib/server/lucia'

export const GET: RequestHandler = async ({ url, cookies }) => {
	const provider = url.searchParams.get('provider')
	if (provider === 'github') {
		const [url, state] = await githubAuth.getAuthorizationUrl()
		cookies.set('oauth_state', state, {
			path: '/',
			maxAge: 60 * 60
		})
		return new Response(null, {
			status: 302,
			headers: {
				location: url.toString()
			}
		})
	}
	return new Response(null, {
		status: 400
	})
}
