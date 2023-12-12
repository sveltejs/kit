import { describe,  expect, test } from "vitest";
import { getHrefBetween } from "./diff-urls.js";

describe("getHrefBetween", () => {
    test("two identical urls with different search query", () => {
        const from = new URL("http://localhost:3000");
        const to = new URL("http://localhost:3000?foo=bar");

        const href = getHrefBetween(from, to);

        expect(href).toBe("?foo=bar");
        expect(new URL(href, from).href).toBe(to.href);
    });

    test("two identical urls with different fragment", () => {
        const from = new URL("http://localhost:3000");
        const to = new URL("http://localhost:3000#some-fragment");

        const href = getHrefBetween(from, to);

        expect(href).toBe("#some-fragment");
        expect(new URL(href, from).href).toBe(to.href);
    });

    test("two identical urls with different search query and fragment", () => {
        const from = new URL("http://localhost:3000");
        const to = new URL("http://localhost:3000?foo=bar#some-fragment");

        const href = getHrefBetween(from, to);

        expect(href).toBe("?foo=bar#some-fragment");
        expect(new URL(href, from).href).toBe(to.href);
    });


    test("two identical urls with different protocols", () => {
        const from = new URL("http://localhost:3000");
        const to = new URL("https://localhost:3000");

        const href = getHrefBetween(from, to);

        expect(href).toBe("https://localhost:3000/");
        expect(new URL(href, from).href).toBe(to.href);
    });

    test("two identical urls with different hosts", () => {
        const from = new URL("http://localhost:3000");
        const to = new URL("http://localhost:3001");

        const href = getHrefBetween(from, to);

        expect(href).toBe("//localhost:3001/");
        expect(new URL(href, from).href).toBe(to.href);
    });

    test("two identical urls with different ports", () => {
        const from = new URL("http://localhost:3000");
        const to = new URL("http://localhost:3001");

        const href = getHrefBetween(from, to);

        expect(href).toBe("//localhost:3001/");
        expect(new URL(href, from).href).toBe(to.href);
    });

    test("get to parents-page", () => {
        const from = new URL("https://example.com/foo/some-page");
        const to = new URL("https://example.com/foo/");

        const href = getHrefBetween(from, to);

        expect(href).toBe(".");
        expect(new URL(href, from).href).toBe(to.href);
    });

    test("get to grand-parents-page", () => {
        const from = new URL("https://example.com/foo/bar/some-page");
        const to = new URL("https://example.com/foo/");

        const href = getHrefBetween(from, to);

        expect(href).toBe("..");
        expect(new URL(href, from).href).toBe(to.href);
    });


    test("get to child page", () => {
        const from = new URL("https://example.com/foo/");
        const to = new URL("https://example.com/foo/some-page");

        const href = getHrefBetween(from, to);

        expect(href).toBe("some-page");
        expect(new URL(href, from).href).toBe(to.href);
    })

    test("get to grand-child page", () => {
        const from = new URL("https://example.com/foo/");
        const to = new URL("https://example.com/foo/bar/some-page");

        const href = getHrefBetween(from, to);

        expect(href).toBe("bar/some-page");
        expect(new URL(href, from).href).toBe(to.href);
    });


    test("get to sibling page", () => {
        const from = new URL("https://example.com/foo/bar/some-page");
        const to = new URL("https://example.com/foo/bar/another-page");

        const href = getHrefBetween(from, to);

        expect(href).toBe("another-page");
        expect(new URL(href, from).href).toBe(to.href);
    });


    test("absolute path is shorter than relative path", () => {
        const from = new URL("https://example.com/foo/bar/some-page");
        const to = new URL("https://example.com/");

        const href = getHrefBetween(from, to);

        expect(href).toBe("/");
        expect(new URL(href, from).href).toBe(to.href);
    })
})