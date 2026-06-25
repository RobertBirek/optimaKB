# Comarch Betterfly API Write-Side Notes

Date: 2026-05-26

This note captures write-side integration guidance derived from official
Betterfly API documentation. It remains metadata-only and does not store live
tenant payloads.

## General rule

- Treat Betterfly write flows as explicit resource workflows, not only as bare
  HTTP methods.
- Before implementing create/update/delete, verify:
  - endpoint family
  - version
  - whether the resource also requires `confirm` or `finalize`
  - whether the flow starts from a source document id

## Create / update / delete families

Confirmed official write-side coverage exists for:

- `products`
  - `POST /api2/public/products`
  - `PUT /api2/public/products`
  - `DELETE /api2/public/products/{id}`
- `customers`
  - `POST /api2/public/v1.2/customers`
  - `PUT /api2/public/v1.2/customers`
  - `DELETE /api2/public/v1.2/customers/{id}`
- `paymenttypes`
  - `POST /api2/public/paymenttypes`
  - `PUT /api2/public/paymenttypes`
  - `DELETE /api2/public/paymenttypes/{id}`
- `bankaccounts`
  - `POST /api2/public/bankaccounts`
  - `PUT /api2/public/bankaccounts`
  - `DELETE /api2/public/bankaccounts/{id}`
- `proformas`
  - `POST /api2/public/v1.4/proformas`
  - `PUT /api2/public/v1.4/proformas`
  - `DELETE /api2/public/proformas/{id}`
- `invoices`
  - current:
    - `POST /api2/public/v1.5/invoices`
    - `PUT /api2/public/v1.5/invoices`
    - `PUT /api2/public/v1.5/invoices/confirm`
    - `DELETE /api2/public/v1.5/invoices/{id}`
  - archived:
    - `POST /api2/public/v1.4/invoices`
    - `PUT /api2/public/v1.4/invoices`
    - `PUT /api2/public/v1.4/invoices/confirm`
    - `DELETE /api2/public/v1.4/invoices/{id}`
- `advanceInvoices`
  - current:
    - `POST /api2/public/v1.5/advanceInvoices`
    - `POST /api2/public/v1.5/advanceInvoices?advanceId={id}`
    - `PUT /api2/public/v1.5/advanceInvoices`
    - `PUT /api2/public/v1.5/advanceInvoices/confirm`
    - `DELETE /api2/public/v1.5/advanceInvoices/{id}`
  - archived:
    - `POST /api2/public/v1.4/advanceInvoices`
    - `POST /api2/public/v1.4/advanceInvoices?advanceId={id}`
    - `PUT /api2/public/v1.4/advanceInvoices`
    - `PUT /api2/public/v1.4/advanceInvoices/confirm`
    - `DELETE /api2/public/v1.4/advanceInvoices/{id}`
- `correctiveinvoices`
  - `POST /api2/public/v1.5/correctiveinvoices?documentId={id}`
  - `PUT /api2/public/v1.5/correctiveinvoices`
  - `PUT /api2/public/v1.5/correctiveinvoices/confirm`
  - `DELETE /api2/public/v1.5/correctiveinvoices/{id}`
- `correctiveadvanceinvoices`
  - `POST /api2/public/v1.5/correctiveadvanceinvoices?documentId={id}`
  - `PUT /api2/public/v1.5/correctiveadvanceinvoices`
  - `PUT /api2/public/v1.5/correctiveadvanceinvoices/confirm`
  - `DELETE /api2/public/v1.5/correctiveadvanceinvoices/{id}`
- `payments`
  - `PUT /api2/public/v1.4/payments`

## Confirm flows

Resources with explicit confirm step:

- `PUT /api2/public/v1.5/invoices/confirm`
- `PUT /api2/public/v1.4/invoices/confirm`
- `PUT /api2/public/v1.5/advanceInvoices/confirm`
- `PUT /api2/public/v1.4/advanceInvoices/confirm`
- `PUT /api2/public/v1.5/correctiveinvoices/confirm`
- `PUT /api2/public/v1.5/correctiveadvanceinvoices/confirm`

Interpretation:

- creation does not always imply final business confirmation
- integration code should model confirm as a separate workflow action

## Finalize flows

Documented finalize flow:

- `POST /api2/public/v1.2/advanceInvoices/{id}/finalize?convertAll=false`
- `POST /api2/public/v1.2/advanceInvoices/{id}/finalize?convertAll=true`

Interpretation:

- finalize is not just update
- it is a business transition from advance invoice to final document outcome
- query flags such as `convertAll` materially change workflow behavior

## Corrective flows

For corrective documents, the documented flow is:

1. `POST ...?documentId={id}` to create a draft correction from source document
2. `PUT ...` to modify the draft
3. `PUT .../confirm` to finalize business confirmation
4. optional `DELETE .../{id}` while still removable

This is the clearest case where a write-side workflow must be modeled as a
sequence, not as one isolated endpoint.

## Integration cautions

- Do not assume one global version line across all write endpoints.
- Document families mix `v1.4`, `v1.5`, and special `v1.2 finalize` flows.
- Deletion examples sometimes show shortened or legacy-looking paths in prose;
  prefer the normalized endpoint family extracted into KB rows.
- Treat print endpoints separately from write flows.
- Treat payment status update separately from `paymentdetails` reads.

## Safety rule

Keep future Betterfly write-side validation metadata-only.
Do not persist tenant write payloads, ids, or business values into repo files or
KB rows.
