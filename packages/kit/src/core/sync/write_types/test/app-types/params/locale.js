/**
 * @param {string} param
 * @returns {param is "en" | "nb"}
 */
export const match = (param) => ['en', 'nb'].includes(param);
