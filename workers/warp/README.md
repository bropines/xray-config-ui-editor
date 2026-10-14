# xcui-warp — the WARP registration relay

The editor registers Cloudflare WARP devices through this Worker. A browser
cannot call `api.cloudflareclient.com` itself (no CORS, and a page cannot set
the client User-Agent), so the Worker stands in — and does nothing else:

- **It never sees a private key.** The editor makes the key pair (X25519 for
  WireGuard, ECDSA P-256 for MASQUE) and sends only the public half.
- **It forwards four calls**, each validated field by field:

  | Relay | Cloudflare | Body the caller controls |
  |---|---|---|
  | `GET /v2/ping` | — | — |
  | `POST /v2/reg` | `POST reg` | `key`: base64 X25519 public key |
  | `GET /v2/reg/:id` | `GET reg/:id` | — (device token in `X-Warp-Token`) |
  | `PATCH /v2/reg/:id` | `PATCH reg/:id` | `warp_enabled`, or `key` + `key_type` + `tunnel_type` |

- **It answers only callers with an access key** (`X-Xcui-Key`), and only
  browsers on the listed origins. The built-in key ships inside the public
  editor, so it is not a secret: it keeps the Worker from being an open relay
  any scanner can find, nothing more. Registrations are also rate limited per
  caller address.

## Your own copy

```sh
cd workers/warp
bun install
bunx wrangler login
```

Set a key of your own — either edit `BUILT_IN_KEYS` in `src/index.ts`, or leave
the code alone and add keys as a secret (comma-separated):

```sh
bunx wrangler secret put ACCESS_KEYS
```

If your editor is not on `https://bropines.github.io` or `localhost`, add its
origin:

```sh
bunx wrangler secret put ALLOWED_ORIGINS
```

Change `name` in `wrangler.jsonc` to anything you like, then:

```sh
bunx wrangler deploy
```

In the editor: **Settings → General → WARP Worker URL** gets the
`https://<name>.<your-subdomain>.workers.dev` address, **Worker key** gets your
key, and **Check the relay** confirms both.

## Tests

```sh
bun test
```
