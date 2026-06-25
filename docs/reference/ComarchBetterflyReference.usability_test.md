# Comarch Betterfly Reference KB Usability Test

Date: 2026-05-26

This test checks whether the current Betterfly KB can answer practical API
questions without relying on live tenant business data.

## Test set

1. How do I obtain a Betterfly API access token?
2. How should I authorize later API requests?
3. Do Betterfly collection endpoints return envelopes or bare arrays?
4. Are Betterfly endpoints consistently versioned?
5. Which endpoint family should I use for products, customers, invoices,
   payments, and prints?
6. Where should I start when implementing filtering and paging?
7. How should I model create, update, confirm, delete, and finalize flows?
8. How should I handle corrective document workflows?
9. How should I distinguish `payments` from `paymentdetails`?
10. How should I treat print endpoints versus normal JSON resources?

## Results

### 1. Token acquisition

Status: PASS

Coverage:

- `ApiPattern`: `BFAPIPAT_TOKEN_FLOW`
- `ApiResource`: `BFAPIRES_TOKEN`
- `EntryGuide`: `BFENTRY_LIVE_AUTH`
- `ReferenceDocument`: `BFRD_LIVE_API_METADATA_PROBE`

Confirmed answer:

- `POST /api2/public/token`
- `Authorization: Basic base64(clientId:clientSecret)`
- `grant_type=client_credentials`
- response keys:
  - `access_token`
  - `token_type`
  - `expires`

### 2. Bearer authorization

Status: PASS

Coverage:

- `ApiPattern`: `BFAPIPAT_BEARER_AUTH`
- `EntryGuide`: `BFENTRY_LIVE_AUTH`
- auth article:
  `https://pomoc.comarchbetterfly.pl/dokumentacja/api-uwierzytelnianie/`

Confirmed answer:

- subsequent Betterfly API requests use `Authorization: Bearer <access_token>`

### 3. Collection response envelope shape

Status: PASS

Coverage:

- `ApiPattern`: `BFAPIPAT_ARRAY_ENVELOPE`
- `LearningGuide`: `BFGUIDE_SAFE_LIVE_VALIDATION`
- live probe chunks from `BFRD_LIVE_API_METADATA_PROBE`

Confirmed answer:

- tested collection endpoints returned bare JSON arrays
- no `items`, `data`, or `results` wrapper was observed in the safe probes

### 4. Versioning consistency

Status: PASS

Coverage:

- `ApiPattern`: `BFAPIPAT_VERSION_MIX`
- `ReferenceDocument` version hints
- resource rows in `api_resource.csv`

Confirmed answer:

- Betterfly mixes:
  - unversioned endpoints, e.g. `/api2/public/products`
  - versioned endpoints, e.g. `/api2/public/v1.2/customers`,
    `/api2/public/v1.4/invoices`

### 5. Endpoint-family discovery

Status: PASS

Coverage:

- `ApiResource` rows:
  - products
  - customers
  - invoices
  - payments
  - prints
- `ApiPattern` rows for concrete methods and paths

Confirmed examples:

- products:
  - `/api2/public/products`
- customers:
  - `/api2/public/v1.2/customers`
- invoices:
  - `/api2/public/v1.5/invoices`
- payment details:
  - `/api2/public/v1.5/paymentdetails`
- payment status:
  - `/api2/public/v1.4/payments`
- invoice print:
  - `/api2/public/v1.4/invoices/{id}/print`

### 6. Filtering and paging entry point

Status: PASS

Coverage:

- `EntryGuide`: `BFENTRY_FILTERING`
- `LearningGuide`: `BFGUIDE_FILTERS`
- filtering article and derived `ApiPattern` rows

Confirmed answer:

- the KB provides a clear route into filtering, sorting, paging, and full-text
  search behavior before resource-specific implementation

### 7. Write-side workflow modeling

Status: PASS

Coverage:

- `ReferenceDocument`: `BFRD_API_WRITE_NOTES`
- `ApiPattern`:
  - `BFAPIPAT_WRITE_CRUD_FAMILIES`
  - `BFAPIPAT_WRITE_CONFIRM_FLOWS`
  - `BFAPIPAT_WRITE_FINALIZE_FLOWS`
  - `BFAPIPAT_WRITE_VERSION_CAUTION`
- `LearningGuide`: `BFGUIDE_WRITE_SIDE_START`
- `EntryGuide`: `BFENTRY_WRITE_SIDE`

Confirmed answer:

- Betterfly write-side work should be modeled as workflow families, not only as
  isolated HTTP methods
- create/update/delete coverage is explicitly documented for:
  - products
  - customers
  - payment types
  - bank accounts
  - proformas
  - invoices
  - advance invoices
- explicit confirm flows exist and should be handled as separate steps
- explicit finalize flow exists for advance-invoice conversion

### 8. Corrective document workflow

Status: PASS

Coverage:

- `ReferenceDocument`:
  - `BFRD_HTTPS_POMOC_COMARCHBETTERFLY_PL_DOKUMENTACJA_API_KOREKTY`
  - `BFRD_API_WRITE_NOTES`
- `ApiPattern`:
  - `BFAPIPAT_WRITE_CORRECTIVE_SEQUENCE`
  - corrective invoice endpoint rows

Confirmed answer:

- corrective flows are staged:
  1. create draft from source document id
  2. update draft
  3. confirm
  4. optional delete while still removable
- this is documented well enough to guide implementation sequencing

### 9. Payments versus paymentdetails

Status: PASS

Coverage:

- `ApiPattern`:
  - `BFAPIPAT_CONTRACT_PAYMENTDETAILS`
  - `BFAPIPAT_CONTRACT_PAYMENTS_CAUTION`
  - `BFAPIPAT_..._API_PLATNOSCI__PUT__API2_PUBLIC_V1_4_PAYMENTS`
- `ReferenceDocument`:
  - `BFRD_HTTPS_POMOC_COMARCHBETTERFLY_PL_DOKUMENTACJA_API_PLATNOSCI`
  - archived `v1.4` payments article

Confirmed answer:

- `paymentdetails` is the read-oriented details family
- `payments` is the payment-status family
- safe probe behavior differs between them
- write-side status update is documented through `PUT /api2/public/v1.4/payments`

### 10. Print endpoints versus JSON resources

Status: PASS

Coverage:

- `ApiPattern`:
  - `BFAPIPAT_CONTRACT_PRINT_CAUTION`
  - print endpoint rows from `API - Wydruki`
- print-related `ApiResource` coverage via document families

Confirmed answer:

- print endpoints should be treated as document/download style operations
- they should not be modeled like ordinary collection reads
- the KB already carries that caution explicitly

## Overall assessment

Result: USEFUL

The current Betterfly KB is now good enough for:

- API onboarding
- auth-flow questions
- endpoint discovery
- version-selection questions
- filtering/paging guidance
- document versus payment endpoint routing
- write-side workflow modeling
- corrective flow sequencing
- confirm/finalize distinctions
- print-versus-JSON endpoint interpretation

## Remaining gaps

1. The KB does not yet model a strict machine-readable request/response schema.
2. It still does not classify field-level write payload structures by endpoint.
3. It does not yet have a separate curated layer for Betterfly error codes and
   negative-path behavior beyond the current caution notes.

## Recommended next enhancement

If Betterfly work becomes more frequent, the next high-value layer is:

- endpoint-specific request/response contract notes
- still metadata-only
- no tenant payload persistence
