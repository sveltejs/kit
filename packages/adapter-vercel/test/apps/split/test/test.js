import * as fs from 'node:fs';
import { expect, test } from '@playwright/test';

const cwd = process.cwd();

const vercel = `${cwd}.vercel/output/functions`;

const assets = '_app/immutable/assets';

test('includes server assets from page', () => {
	expect(fs.existsSync(`${vercel}/fn-2.func/${assets}/component2.2e05b0ae.txt`)).toBeTruthy();
});

test('includes server assets from layouts', () => {
	expect(fs.existsSync(`${vercel}/fn-2.func/${assets}/component1.49f0d6ea.txt`)).toBeTruthy();
	expect(fs.existsSync(`${vercel}/fn-2.func/${assets}/layout3.d0b1d3a8.txt`)).toBeTruthy();
})

test('includes server assets from load functions', () => {
	expect(fs.existsSync(`${vercel}/fn-2.func/${assets}/layout1.a02b2ee3.txt`)).toBeTruthy();
	expect(fs.existsSync(`${vercel}/fn-2.func/${assets}/layout2.ccbbe7cd.txt`)).toBeTruthy();
	expect(fs.existsSync(`${vercel}/fn-2.func/${assets}/page1.4a715ec1.txt`)).toBeTruthy();
	expect(fs.existsSync(`${vercel}/fn-2.func/${assets}/page2.b0565940.txt`)).toBeTruthy();
});

test('includes server assets from endpoints', () => {
	expect(fs.existsSync(`${vercel}/fn-1.func/${assets}/endpoint.b6bf7bc8.txt`)).toBeTruthy();
});

test('only includes required server assets for each function', () => {
	expect(fs.existsSync(`${vercel}/fn-2.func/${assets}/endpoint.b6bf7bc8.txt`)).toBeFalsy();
	expect(fs.existsSync(`${vercel}/fn-2.func/${assets}/component1.49f0d6ea.txt`)).toBeTruthy();
	expect(fs.existsSync(`${vercel}/fn-2.func/${assets}/component2.2e05b0ae.txt`)).toBeTruthy();
	expect(fs.existsSync(`${vercel}/fn-2.func/${assets}/layout1.a02b2ee3.txt`)).toBeTruthy();
	expect(fs.existsSync(`${vercel}/fn-2.func/${assets}/layout2.ccbbe7cd.txt`)).toBeTruthy();
	expect(fs.existsSync(`${vercel}/fn-2.func/${assets}/page1.4a715ec1.txt`)).toBeTruthy();
	expect(fs.existsSync(`${vercel}/fn-2.func/${assets}/page2.b0565940.txt`)).toBeTruthy();

	expect(fs.existsSync(`${vercel}/fn-1.func/${assets}/endpoint.b6bf7bc8.txt`)).toBeTruthy();
	expect(fs.existsSync(`${vercel}/fn-1.func/${assets}/component1.49f0d6ea.txt`)).toBeFalsy();
	expect(fs.existsSync(`${vercel}/fn-1.func/${assets}/component2.2e05b0ae.txt`)).toBeFalsy();
	expect(fs.existsSync(`${vercel}/fn-1.func/${assets}/layout1.a02b2ee3.txt`)).toBeFalsy();
	expect(fs.existsSync(`${vercel}/fn-1.func/${assets}/layout2.ccbbe7cd.txt`)).toBeFalsy();
	expect(fs.existsSync(`${vercel}/fn-1.func/${assets}/page1.4a715ec1.txt`)).toBeFalsy();
	expect(fs.existsSync(`${vercel}/fn-1.func/${assets}/page2.b0565940.txt`)).toBeFalsy();
});

test('includes transitive server assets', () => {
	expect(fs.existsSync(`${vercel}/fn-0.func/${assets}/transitive.f0151e85.txt`)).toBeTruthy();
});

test('includes server assets from the default error page for every function', () => {
	expect(fs.existsSync(`${vercel}/fn-0.func/${assets}/error1.f6113f76.txt`)).toBeTruthy();
	expect(fs.existsSync(`${vercel}/fn-0.func/${assets}/layout3.d0b1d3a8.txt`)).toBeTruthy();

	expect(fs.existsSync(`${vercel}/fn-1.func/${assets}/error1.f6113f76.txt`)).toBeTruthy();
	expect(fs.existsSync(`${vercel}/fn-1.func/${assets}/layout3.d0b1d3a8.txt`)).toBeTruthy();

	expect(fs.existsSync(`${vercel}/fn-2.func/${assets}/error1.f6113f76.txt`)).toBeTruthy();
	expect(fs.existsSync(`${vercel}/fn-2.func/${assets}/layout3.d0b1d3a8.txt`)).toBeTruthy();

	expect(fs.existsSync(`${vercel}/fn.func/${assets}/error1.f6113f76.txt`)).toBeTruthy();
	expect(fs.existsSync(`${vercel}/fn.func/${assets}/layout3.d0b1d3a8.txt`)).toBeTruthy();
});
