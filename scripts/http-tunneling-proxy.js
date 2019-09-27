#!/usr/bin/env node

'use strict';

const http = require('http');
const net  = require('net');

const port   = +process.env.PORT;
const server = http.createServer();

// Listener for HTTP CONNECT requests
server.on( 'connect', ( req, cltSock, head ) => {
  const [ host, port ] = req.url.split(':');

  console.log( `Received CONNECT request for ${ host }:${ port }` );

  cltSock.on( 'error', err => {
    console.error( 'Client socket: ' + err.message );
  });

  const srvSock = net.connect( port, host, () => {
    console.log( `Connected to ${ host }:${ port }` );

    cltSock.write('HTTP/1.1 200 Connection Established\r\n\r\n');
    srvSock.write( head );

    console.log( `Piping client connection to ${ host }:${ port }` );

    srvSock
    .once( 'close', () => cltSock.end() )
    .once( 'end', () => cltSock.end() )
    .pipe( cltSock )
    .once( 'close', () => srvSock.end() )
    .once( 'end', () => srvSock.end() )
    .pipe( srvSock );
  })
  .on( 'error', err => console.error( 'Server socket: ' + err.message ) )
  .once( 'error', () => cltSock.end() );
});

server.listen( port, () => {
  console.log( 'HTTP tunneling proxy listening on ' + port );
});
