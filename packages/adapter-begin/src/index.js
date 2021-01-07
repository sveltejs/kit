'use strict';

const url = require('url');
const app = require('@architect/shared/app.js');

exports.handler = async (event) => {
  const {
    host,
    rawPath: path,
    httpMethod,
    headers,
    queryStringParameters,
    body
  } = event;

  const query = new url.URLSearchParams();
  for (const k in queryStringParameters) {
    const value = queryStringParameters[k];
    value.split(', ').forEach((v) => {
      query.append(k, v);
    });
  }

  const rendered = await app.render({
    host,
    method: httpMethod,
    headers,
    path,
    body,
    query
  });

  if (rendered) {
    return {
      isBase64Encoded: false,
      statusCode: rendered.status,
      headers: rendered.headers,
      body: rendered.body
    };
  }

  return {
    statusCode: 404,
    body: 'Not Found'
  };
};
