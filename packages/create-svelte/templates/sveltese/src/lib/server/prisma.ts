import { PrismaClient } from '@prisma/client';

// Avoid instantiating too many instances of Prisma in development
// https://www.prisma.io/docs/support/help-articles/nextjs-prisma-client-dev-practices#problem
let prismaClient: PrismaClient;

if (process.env.NODE_ENV === 'production') {
	prismaClient = new PrismaClient();
} else {
	if (!global.prismaClient) {
		global.prismaClient = new PrismaClient();
	}
	prismaClient = global.prismaClient;
}

export default prismaClient;
