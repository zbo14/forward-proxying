# Forward proxying
This is the repo for a presentation I did on forward proxies!

## What is a forward proxy?
* Think of it as a two-way detour for network traffic originating from/coming back to a client
* Proxy receives octets from the client and sends octets to a destination host specified by the client
* Proxy receives octets from the destination host and forwards them to the client

## Why use a forward proxy?
* Obscure ultimate destination of web traffic
* Block outbound access to certain websites
* Circumvent restrictive firewall rules that prevent outbound traffic to certain websites
* Encrypt traffic when visiting HTTP sites on untrusted network (e.g. using SOCKS proxy that tunnels traffic over SSH)
* Modify requests from your browser on the fly

## Types of forward proxies

### HTTP proxy
The following overview reflects the naive implementation in `/scripts/http-proxy.js`.

#### Overview
1. Client crafts HTTP request and specifies destination host in [`Forwarded`](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Forwarded) or [`X-Forwarded-Host`](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/X-Forwarded-Host) headers
1. Proxy receives HTTP request from client and sends nearly-identical HTTP/S request to destination host
1. Proxy receives HTTP/S response from destination host and forwards it to client

#### Pros
* Is HTTP aware; doesn't require tunneling a transport layer protocol through an application level protocol

#### Cons
* Doesn't appear to be well-supported in browsers or system settings
* All HTTP requests from client aren't encrypted

### HTTPS proxy
A good example is [mitmproxy](https://mitmproxy.org/).

#### Overview
1. Proxy receives HTTPS request from client and pretends to be the destination host by forging a TLS certificate for domain signed by a trusted authority.
1. Proxy sends the HTTPS request to the actual destination host
1. Proxy receives the HTTPS response from the host and forwards it to the client

#### Pros
* Allows users to view their own encrypted web traffic (more convenient to do this in the browser though)
* Allows users to modify their own encrypted web traffic on the fly

#### Cons
* Overhead of negotiating multiple TLS sessions per request
* Proxy has to do a lot of work generating certs on-demand

### HTTP tunneling proxy
Refer to implementation in `/scripts/http-tunneling-proxy.js`.

#### Overview
1. Proxy receives an [HTTP `CONNECT` request](https://developer.mozilla.org/en-US/docs/Web/HTTP/Methods/CONNECT) from the client with destination hostname/port
1. Proxy establishes a TCP connection to hostname/port and "pipes" it to the client socket from the HTTP `CONNECT` request
1. Traffic then flows between the client and destination host through the "pipe"

#### Pros
* Sometimes supported where SOCKS isn't (e.g. check your iphone)
* Tor can be used as an HTTP tunneling proxy

#### Cons
* More overhead than SOCKS
  * We're using an application level protocol (HTTP) to tunnel a transport layer protocol (TCP)
  * Each `CONNECT` request includes HTTP headers
* Cannot proxy DNS requests
* Client `CONNECT` requests aren't encrypted (traffic to/from HTTPS website is encrypted once TLS session is negotiated over "pipe")

### SOCKS proxy

#### Overview
The [wiki page](https://en.wikipedia.org/wiki/SOCKS) has explanations of the different protocol versions.

The following summary hand-waves some details, e.g. how the SOCKS4 handshake involves a single exchange of messages while SOCKS5 requires multiple.

1. Proxy accepts a TCP connection from client and receives octets specifying...
  * SOCKS version (4 or 5)
  * SOCKS command
      * Establish a TCP/IP stream connection
      * Associate a UDP port (in version 5)
  * Destination host and port
  * Optional user ID
  * Authentication method/credentials (in version 5)
2. Proxy attempts to connect to destination host and responds to client with octets specifying...
  * SOCKS version (4 or 5)
  * Chosen authentication method, if any (in version 5)
  * Status code
  * Bound address and port
3. If the handshake is successful, subsequent octets received on the client socket will be sent to the destination host (and vice-versa)

#### Pros
* SOCKS5 supports UDP port association so we can proxy DNS requests
* Tor can be used as a SOCKS proxy
* `OpenSSH` supports dynamic port forwarding and can act as a SOCKS proxy

```bash
## use `-D` to start a SOCKS proxy server on local port 12345
## use `-N` since we only want to forward ports

ssh -Nv -D 127.0.0.1:12345 -i $KEY $USER@$HOST
```

#### Cons
* Some applications/devices don't support SOCKS proxies
* Traffic from client to SOCKS proxy isn't encrypted

## What forward proxy should I use?
Depends on what you're trying to do and what's supported by the applications/devices you're using. If you want to man-in-the-middle your own web traffic, then you'd use a TLS interception proxy like `mitmproxy`. Otherwise, you'd probably want to use a tunneling proxy. The ideal option would be a SOCKS proxy that tunnels your traffic over SSH. If the client you're using doesn't support SOCKS then an HTTP tunneling proxy will do.
