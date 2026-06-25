# Comarch Betterfly Live API Metadata Probe

Date: 2026-05-26

This note records only safe technical observations from a temporary Betterfly
API validation pass. It is metadata-only. It does not persist tenant business
payloads.

## Confirmed authentication flow

- Token endpoint: `POST https://app.comarchbetterfly.pl/api2/public/token`
- Request content type: `application/x-www-form-urlencoded`
- Authorization model: `Authorization: Basic base64(clientId:clientSecret)`
- Body: `grant_type=client_credentials`
- Token response shape:
  - `access_token`
  - `token_type`
  - `expires`
- Observed token lifetime: `600` seconds

## Confirmed authorization usage

- Business API requests use `Authorization: Bearer <access_token>`
- The access token obtained from `/api2/public/token` is sufficient for public
  API endpoint access

## Confirmed response-envelope behavior

Safe read-side probes against selected endpoints confirmed that collection
responses are returned as bare JSON arrays, not wrapped in an envelope such as
`items`, `data`, or `results`.

Confirmed examples:

- `GET /api2/public/products?$top=1`
- `GET /api2/public/v1.2/customers?$top=1`
- `GET /api2/public/paymenttypes?$top=1`
- `GET /api2/public/bankaccounts?$top=1`
- `GET /api2/public/v1.4/invoices?$top=1`

## Confirmed versioning pattern

The Betterfly API mixes unversioned and versioned endpoint families.

Observed examples:

- unversioned:
  - `/api2/public/products`
  - `/api2/public/paymenttypes`
  - `/api2/public/bankaccounts`
- versioned:
  - `/api2/public/v1.2/customers`
  - `/api2/public/v1.4/invoices`

This means integrators should not assume a single global version prefix across
all Betterfly API resources.

## Safety rule

Future live Betterfly validation in this workspace must remain metadata-only:

- token flow
- endpoint reachability
- version/path availability
- response-envelope shape
- auth/error behavior

Do not persist tenant business payloads into repo files or KB rows.
