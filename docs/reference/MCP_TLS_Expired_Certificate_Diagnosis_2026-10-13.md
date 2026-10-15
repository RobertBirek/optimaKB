# Connected MCP TLS expiry diagnosis — 2026-10-13

## Finding

**Confirmed: the currently served server leaf certificate for `optima.kag.taxbell.pl` expired at `2026-10-13 10:28:21 UTC`.** Fresh validated OpenSSL/curl connections fail at **depth 0**, before HTTP/MCP. The public target and documented LAN NPMplus host serve the identical leaf and complete supplied chain.

The reason renewal or deployment did not replace this leaf remains unresolved: remote NPMplus certificate-manager state and renewal/deployment logs are not available in this session. The exact managed certificate ID is **unknown**, not inferred from the certificate serial.

Structured probe window: **2026-10-13T20:14:37.500949Z–20:14:39.400277Z**. Final profile health observation: **2026-10-13T20:15:15.583807Z**. Initial UTC clock observation: `19:45:45Z`; individual connected-tool calls were not separately timestamped. See the companion JSON for certificate facts and per-probe times.

## Actual configured endpoints

Source: active `/root/.config/opencode/opencode.jsonc`, inspected exclusively through `/tmp/opencode/mcp_endpoint_metadata.py`. Its output is restricted to server name, hostname, scheme, port and path; userinfo, queries, headers/auth and raw config are never emitted. No OpenCode configuration edit was made.

| Connected server | Configured public endpoint |
|---|---|
| AccountingTaxKB | `https://optima.kag.taxbell.pl:443/mcp/accounting-tax-mcp` |
| PayrollHrKB | `https://optima.kag.taxbell.pl:443/mcp/payroll-hr-mcp` |
| OptimaProductKB | `https://optima.kag.taxbell.pl:443/mcp/optima-product-mcp` |
| LegalComplianceKB | `https://optima.kag.taxbell.pl:443/mcp/legal-compliance-mcp` |

Each connected server's `list_knowledge_bases` read tool independently returned **`certificate has expired`** in this session. Earlier search-tool failures are documented in `Post_Correction_Live_Transport_Check_2026-10-13.md`.

The rollout's `erp-kb.mcp.taxbell.local` and example `erp-kb-mcp.intra.example.local` URLs are not the current client endpoints. System resolver output for the actual hostname gives **46.174.24.27**, also the actual public curl remote IP. The IPv6 resolver query returned only IPv4-mapped addresses, no native IPv6 target.

## Certificate evidence

Leaf:

- Subject / SAN: `CN=optima.kag.taxbell.pl` / `DNS:optima.kag.taxbell.pl`.
- Issuer: `C=US, O=Let's Encrypt, CN=YE1`.
- Not before: **2026-07-15 10:28:22 UTC**.
- Not after: **2026-10-13 10:28:21 UTC**.
- Serial: `05A386025097CE1FD5F74B9C2536E160AB75`.
- SHA-256 fingerprint: `78:89:E5:C2:87:6D:F2:A4:C7:A0:D6:DE:7B:12:AB:EC:14:3A:9E:42:8C:B3:D9:78:B2:22:4D:AE:B2:C0:E1:32`.
- `openssl x509 -checkhost optima.kag.taxbell.pl`: **matches**.

Complete server-supplied chain (CA certificates have no SAN DNS entries):

| Depth | Subject → issuer | Not before UTC | Not after UTC |
|---|---|---|---|
| 0 | optima.kag.taxbell.pl → Let's Encrypt YE1 | 2026-07-15 10:28:22 | **2026-10-13 10:28:21** |
| 1 | Let's Encrypt YE1 → ISRG Root YE | 2025-09-03 00:00:00 | 2028-09-02 23:59:59 |
| 2 | ISRG Root YE → ISRG Root X2 | 2026-05-13 00:00:00 | 2032-09-02 23:59:59 |
| 3 | ISRG Root X2 → ISRG Root X1 | 2026-05-13 00:00:00 | 2032-09-02 23:59:59 |

Non-leaf SHA-256 fingerprints:

```text
YE1:     A2:37:2D:06:43:1E:97:16:36:5E:EE:D4:7E:C0:20:35:14:97:D1:82:FC:C0:38:E4:57:E5:81:68:A0:3C:AC:07
Root YE: 0F:C0:90:1C:CA:2B:AE:9E:9F:DB:B0:2D:50:D0:2F:10:94:F7:B3:66:72:08:69:91:B9:E8:97:62:6D:C4:85:F0
Root X2: EE:5F:7A:BD:69:81:BB:02:55:63:2C:D8:F4:92:83:45:1B:4B:18:84:4D:12:04:0B:44:EE:00:F0:7B:8F:E2:C6
```

Each fresh OpenSSL connection to the hostname, explicit `46.174.24.27:443`, and explicit `10.10.254.46:443` used SNI and hostname verification for `optima.kag.taxbell.pl`. All returned exit 1 / verification code **10**, with depths 3/2/1 verified before the depth-0 expiry error. Fingerprints for **all four supplied certificates** matched across all three connections.

Validated curl requests to `/health` and all four configured public MCP paths returned exit **60**, `ssl_verify_result=10`, `http_code=000`, remote IP `46.174.24.27`. Pinning the hostname to `10.10.254.46` with `--resolve` produced the same failure. No application response was accepted through failed TLS.

Reproduction commands (ordinary trust verification, no credentials):

```bash
openssl s_client -connect optima.kag.taxbell.pl:443 \
  -servername optima.kag.taxbell.pl -showcerts \
  -verify_return_error -verify_hostname optima.kag.taxbell.pl </dev/null

openssl s_client -connect 10.10.254.46:443 \
  -servername optima.kag.taxbell.pl -showcerts \
  -verify_return_error -verify_hostname optima.kag.taxbell.pl </dev/null

curl --noproxy '*' --connect-timeout 8 --max-time 15 \
  --silent --show-error --output /dev/null \
  --write-out 'http_code=%{http_code} remote_ip=%{remote_ip} ssl_verify_result=%{ssl_verify_result}\n' \
  https://optima.kag.taxbell.pl/mcp/accounting-tax-mcp

python3 /tmp/opencode/mcp_tls_probe.py
python3 /tmp/opencode/mcp_lan_health.py
```

The temporary probes output public certificate metadata and allowlisted health fields only; they do not emit cookies, auth headers or arbitrary response bodies. `--noproxy '*'` makes curl contact the target directly, independently of proxy environment settings. These are network read probes, not runtime-changing test runners.

## Backend and topology comparison

Documented remote reverse proxy: **NPMplus on 10.10.254.46**. Historical confirmed bridge upstream: **http://10.10.254.42:3400** (`OpenSPG_KB_Operational_Memory.md:1998–2032`, rollout document sections 5–8).

Current observations:

| Target | Result |
|---|---|
| Public HTTPS hostname /health | TLS expiry; health inaccessible with validated HTTPS |
| LAN proxy HTTPS, same hostname/SNI | Same TLS expiry and chain |
| LAN proxy HTTP /health with Host optima.kag.taxbell.pl | HTTP 301; not followed; not proof of backend health |
| 10.10.254.42:3400 /health | HTTP 200, ok=true, erp-knowledge-assistant, legacy profile |
| 10.10.254.42:3422 /health | HTTP 200, ok=true, optima-product-mcp |
| 10.10.254.42:3423 /health | HTTP 200, ok=true, legal-compliance-mcp |
| 10.10.254.42:3424 /health | HTTP 200, ok=true, accounting-tax-mcp |
| 10.10.254.42:3425 /health | HTTP 200, ok=true, payroll-hr-mcp |

All five corresponding systemd units are active/running. `ss -ltn` confirms listeners on **10.10.254.42**, not loopback. Initial profile health attempts on 127.0.0.1 failed with curl exit 7; this was explained by the bind address and followed by successful LAN-address checks. Docker name/image/status metadata shows the OpenSPG server/mysql/neo4j/minio healthy and no local NPMplus container.

The identical live public/LAN certificate deployment strongly links the TLS issue to the documented remote proxy boundary. The public-to-LAN NAT mapping and the current public virtual-host upstream assignment were not inspected; backend health alone does not establish the public route's exact upstream.

## Alternative causes checked

- **Expired intermediate:** not the observed failure. All supplied non-leaf certificates remain within their validity periods; OpenSSL fails on the leaf at depth 0.
- **Client cache:** cannot explain this failure alone. Independent new OpenSSL/curl connections obtain the same expired certificate directly from the server.
- **Wrong SNI / hostname:** explicitly correct SNI on each target; SAN matches and x509 hostname check succeeds.
- **Wrong local time:** `timedatectl` reports `NTPSynchronized=yes`, timezone Europe/Warsaw, observed system time `2026-10-13 22:13:35 CEST` = `20:13:35 UTC`. Subsequent UTC observations are also after expiry. No clock modification was made. This checks the local observer, not an inaccessible remote host clock.

## Minimal next action and actual blocker

The operator of **NPMplus on 10.10.254.46**, serving SNI `optima.kag.taxbell.pl:443`, must identify the existing proxy-host entry and its assigned managed certificate. Match the hostname plus **public serial/fingerprint above**, then return the actual certificate ID and redacted renewal/deployment status. The manager's internal ID and exact container/unit name are not in the checked reference documents and cannot be derived from a public TLS handshake.

**Access blocker:** this session has local host tools on `/docker/openspg` and unauthenticated remote HTTP/TLS access, but no supplied authorized remote NPMplus administrative session or operator metadata. No credential/login files, proxy database, remote authenticated administration endpoints or `data/` files were accessed. It is therefore not possible here to distinguish failed issuance from a renewed certificate that was never attached/reloaded, or to provide a proven managed certificate ID.

Proposed minimal remediation, **not executed**:

1. On that existing remote manager, identify the actual hostname/certificate assignment and review the redacted failed renewal/deployment outcome.
2. If a valid replacement already exists, attach/deploy it using the manager's normal reload mechanism. Otherwise renew the existing assigned certificate through its current manager after resolving the evidenced renewal/challenge failure. The certificate issuer is observed as Let's Encrypt; the specific ACME client, challenge type and renewal scheduler are not established.
3. Verify the newly served leaf, hostname and chain through normal validated OpenSSL/curl on both public DNS and LAN proxy; then retry all four connected read tools.

No certificate/proxy/client config edits, TLS bypass, service restarts, cron installation, business-data inspection or commits were performed. Persistent additions are this Markdown report and its JSON companion; diagnostic scripts are confined to `/tmp/opencode`.

## Controller follow-up: trusted administration channel

The controller attempted the existing noninteractive SSH channel with strict
host verification:

```sh
ssh -o BatchMode=yes -o StrictHostKeyChecking=yes -o ConnectTimeout=5 root@10.10.254.46 hostname
```

The connection stopped before authentication and remote command execution:
`No ED25519 host key is known for 10.10.254.46` and
`Host key verification failed.` No host key was added and no check bypassed.
This does not prove that valid SSH authentication is unavailable; it establishes
that a trusted channel is not configured in this session. An independently
verified host key plus authorized administration, or action through the
operator's existing NPMplus session, is needed before remote renewal/deployment.
