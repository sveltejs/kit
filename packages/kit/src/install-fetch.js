// @ts-nocheck
import fetch, { Response, Request, Headers } from 'node-fetch';

globalThis.fetch = fetch;
globalThis.Response = Response;
globalThis.Request = Request;
globalThis.Headers = Headers;
