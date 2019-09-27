#!/usr/bin/env node

'use strict';

const { once } = require('events');
const http     = require('http');
const https    = require('https');

const port   = +process.env.PORT;
const server = http.createServer();

server.on( 'request', async( req1, resp1 ) => {
  const promise = once( req1, 'end' );

  let body1 = '';

  req1.on( 'data', chunk => {
    body1 += chunk;
  });

  let {
    forwarded,
    'x-forwarded-host':  host,
    'x-forwarded-proto': proto = 'https',
    ...headers
  } = req1.headers;

  if ( forwarded ) {
    ({ host, proto } = forwarded
    .split(';')
    .reduce( ( obj, line ) => {
      const [ name, value ] = line.split('=');
      return { ...obj, [ name ]: value };
    }, {} ) );
  }

  let result;

  try {
    if ( !host ) {
      throw new Error('Expected forwarded host');
    }

    console.log( `Sending ${ req1.method } request to ${ proto }://${ host }` );

    const opts = { host, method: req1.method, headers: { ...headers, host } };

    const { request } = proto === 'https' ? https : http;

    await promise;

    result = await new Promise( ( resolve, reject ) => {
      request( opts, resp2 => {
        const { statusCode, headers } = resp2;

        let body2 = '';

        resp2
        .on( 'data', chunk => {
          body2 += chunk;
        })
        .once( 'end', () => resolve({ statusCode, headers, body: body2 }) )
        .once( 'error', reject );
      })
      .once( 'error', reject )
      .end( body1 || '' );
    });
  } catch ({ message }) {
    result = { statusCode: 500, body: message };
  }

  console.log( `Received response from ${ proto }://${ host }` );

  Object
  .entries( result.headers || {} )
  .forEach( ([ name, value ]) => resp1.setHeader( name, value ) );

  resp1.writeHead( result.statusCode );
  resp1.end( result.body || '' );
});

server.listen( port, () => console.log( 'HTTP proxy listening on ' + port ) );
