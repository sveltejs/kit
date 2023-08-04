import lucia from 'lucia-auth'
import { sveltekit } from 'lucia-auth/middleware'
import prisma from '@lucia-auth/adapter-prisma'
import { prisma as prismaClient } from '$lib/server/prisma'
import { dev } from '$app/environment'

import { github } from '@lucia-auth/oauth/providers'
import { GITHUB_CLIENT_ID, GITHUB_CLIENT_SECRET } from '$env/static/private'

export const auth = lucia({
	adapter: prisma(prismaClient),
	env: dev ? 'DEV' : 'PROD',
	transformDatabaseUser: (authUser) => {
		return {
			userId: authUser.id,
			email: authUser.email,
			name: authUser.name,
			avatar: authUser.avatar
		}
	},
	middleware: sveltekit()
})

export const githubAuth = github(auth, {
	clientId: GITHUB_CLIENT_ID,
	clientSecret: GITHUB_CLIENT_SECRET
})

export type Auth = typeof auth
