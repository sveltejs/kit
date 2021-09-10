export const generateCspNonce = () => btoa(crypto.getRandomValues(new Uint32Array(4)));
