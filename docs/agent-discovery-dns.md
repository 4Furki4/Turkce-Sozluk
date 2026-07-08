# Agent Discovery DNS

Publish DNS for AI Discovery records in the public DNS zone for
`turkce-sozluk.com`. These records advertise the site's agent-readable API
catalog from DNS, complementing the homepage `Link` response header.

## Required Records

Add this DNS-AID organization index record:

```dns
_index._agents.turkce-sozluk.com. 3600 IN SVCB 1 turkce-sozluk.com. alpn=h2 port=443 mandatory=alpn,port key65280="/.well-known/api-catalog"
```

If the DNS provider requires an `HTTPS` record for HTTPS service bindings, use
the same RDATA with record type `HTTPS`:

```dns
_index._agents.turkce-sozluk.com. 3600 IN HTTPS 1 turkce-sozluk.com. alpn=h2 port=443 mandatory=alpn,port key65280="/.well-known/api-catalog"
```

Notes:

- `_index._agents.turkce-sozluk.com` is the DNS-AID well-known organization
  index entrypoint.
- `turkce-sozluk.com.` is the service endpoint and must not contain underscore
  labels because agents use it for TLS endpoint validation.
- `alpn=h2` and `port=443` describe the HTTPS endpoint agents should use.
- `key65280` is in the RFC 9460 private-use SvcParamKey range and carries the
  API catalog path until DNS-AID parameters such as `well-known` are registered.

## Cloudflare

In Cloudflare DNS:

1. Open the `turkce-sozluk.com` zone.
2. Add an `SVCB` record if the dashboard supports it.
3. Set name to `_index._agents`.
4. Set priority to `1`.
5. Set target to `turkce-sozluk.com`.
6. Add parameters: `alpn=h2`, `port=443`, `mandatory=alpn,port`,
   `key65280="/.well-known/api-catalog"`.
7. Use TTL `3600`.
8. Enable DNSSEC for the zone, then publish the DS record at the registrar.

If the dashboard does not support SVCB/private SvcParamKeys, use the Cloudflare
API or a DNS provider that can publish RFC 9460 SVCB records with generic
`keyNNNNN` parameters.

## Validation

Check the public record:

```bash
dig +short TYPE64 _index._agents.turkce-sozluk.com
```

Check DNSSEC is delegated:

```bash
dig +short DS turkce-sozluk.com
dig +dnssec DNSKEY turkce-sozluk.com
```

Run the agent-readiness scan:

```bash
curl -s https://isitagentready.com/api/scan \
  -H 'Content-Type: application/json' \
  --data '{"url":"https://turkce-sozluk.com"}'
```

The DNS-AID check should report:

```json
{
  "checks": {
    "discoverability": {
      "dnsAid": {
        "status": "pass"
      }
    }
  }
}
```
