export const generateRandomString = (bytes) => btoa(crypto.getRandomValues(new Uint8Array(bytes)));
