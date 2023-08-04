import type { PrismaClient } from '@prisma/client'
import type { Transporter } from 'nodemailer'

// See https://kit.svelte.dev/docs/types#app
// for information about these interfaces
declare global {
	namespace App {
		// interface Error {}
		interface Locals {
			auth: import('lucia-auth').AuthRequest
		}
		// interface PageData {}
		// interface Platform {}
	}
	var prisma: PrismaClient
	var emailClient: nodemailer.Transporter
}

/// <reference types="lucia-auth" />
declare global {
	namespace Lucia {
		type Auth = import('$lib/server/lucia').Auth
		type UserAttributes = {
			email: string
			name: string
			avatar?: string
		}
	}
}

export {}
