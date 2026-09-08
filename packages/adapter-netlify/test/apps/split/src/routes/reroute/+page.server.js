/** @type {import('@sveltejs/adapter-netlify').Config} */
export const config = { runtime: process.env.EDGE === 'true' ? 'nodejs24.x' : 'edge' };
