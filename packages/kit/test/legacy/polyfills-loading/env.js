export const dev = process.env.DEV === 'true';
export const legacy_polyfill = !dev && process.env.LEGACY_POLYFILL === 'true';
export const modern_polyfill = !dev && !!process.env.MODERN_POLYFILL === 'true';
