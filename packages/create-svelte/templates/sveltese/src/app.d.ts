import type { PrismaClient } from '@prisma/client';
import type { Transporter } from 'nodemailer';

// See https://kit.svelte.dev/docs/types#app
// for information about these interfaces
declare global {
	namespace App {
		// interface Error {}
		interface Locals {
			auth: import('lucia').AuthRequest;
		}
		// interface PageData {}
		// interface Platform {}
	}
	// eslint-disable-next-line no-var
	var prismaClient: PrismaClient;
	// eslint-disable-next-line no-var
	var emailClient: Transporter;
}

/// <reference types="lucia-auth" />
declare global {
	namespace Lucia {
		type Auth = import('$lib/server/lucia').Auth;
		type DatabaseUserAttributes = {
			email: string;
			name: string;
			avatar?: string;
		};
		type DatabaseSessionAttributes = {};
	}
}

export {};
