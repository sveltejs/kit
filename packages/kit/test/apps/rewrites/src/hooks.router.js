const mapping = {
    "/basic/a": "/basic/b",
    "/client-only-redirect/a": "/client-only-redirect/b",
    "/preload-data/a": "/preload-data/b",
}

/** @type {import("@sveltejs/kit").RewriteUrl} */
export const rewriteUrl = ({ url }) => {
    url.pathname = mapping[url.pathname] || url.pathname


    if (url.pathname === "/external/rewritten") {
        return new URL("https://google.com")
    }

    return url
}
