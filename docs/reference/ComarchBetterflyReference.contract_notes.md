# Comarch Betterfly API Contract Notes

Date: 2026-05-26

This note stores metadata-only endpoint contract observations for selected
Betterfly API resources. It does not persist tenant business values.

## Token endpoint

- Endpoint: `POST /api2/public/token`
- Auth request header:
  - `Authorization: Basic base64(clientId:clientSecret)`
- Body:
  - `grant_type=client_credentials`
- Response keys:
  - `access_token`
  - `token_type`
  - `expires`

## Products collection

- Endpoint: `GET /api2/public/products?$top=1`
- Observed response shape:
  - JSON array
- Observed top-level item keys:
  - `Description`
  - `Id`
  - `ItemCode`
  - `Name`
  - `ProductCode`
  - `ProductType`
  - `Quantity`
  - `Rate`
  - `SaleGrossPrice`
  - `SaleNetPrice`
  - `UnitOfMeasurment`

## Customers collection

- Endpoint: `GET /api2/public/v1.2/customers?$top=1`
- Observed response shape:
  - JSON array
- Observed top-level item keys:
  - `Address`
  - `CountryCode`
  - `CustomerCode`
  - `CustomerStatus`
  - `CustomerTaxNumber`
  - `CustomerType`
  - `Id`
  - `Mail`
  - `Name`
  - `PhoneNumber`
  - `RepresentativeFirstName`
  - `RepresentativeLastName`

## Invoices collection

- Endpoint: `GET /api2/public/v1.4/invoices?$top=1`
- Observed response shape:
  - JSON array
- Observed top-level item keys:
  - `BankAccountId`
  - `BankAccountNumber`
  - `CurrencyCode`
  - `CurrencyConverter`
  - `CurrencyGrossTotal`
  - `CurrencyNetTotal`
  - `CurrencyRate`
  - `CurrencyRateDate`
  - `CurrencyRateType`
  - `CurrencyVatTotal`
  - `Description`
  - `DocumentCreatedByTaxPayer`
  - `GrossTotal`
  - `Id`
  - `InvoiceType`
  - `IsFinal`
  - `IsOSSProcedure`
  - `IssueDate`
  - `Items`
  - `NetTotal`
  - `Number`
  - `OSSProcedureCountryCode`
  - `PaymentDeadline`
  - `PaymentId`
  - `PaymentStatus`
  - `PaymentType`
  - `PaymentTypeId`
  - `PurchasingParty`
  - `PurchasingPartyId`
  - `ReceivingParty`
  - `ReceivingPartyId`
  - `SalesDate`
  - `Status`
  - `VatTotal`

## Payment details collection

- Endpoint: `GET /api2/public/v1.5/paymentdetails?$top=1`
- Observed response shape:
  - JSON array
- Observed top-level item keys:
  - `Amount`
  - `Balance`
  - `CashAccounting`
  - `CreationDate`
  - `Currency`
  - `DocumentId`
  - `DocumentNumber`
  - `DocumentType`
  - `DueDate`
  - `ExchangeRate`
  - `ExportStatus`
  - `IssueDate`
  - `Payable`
  - `PaymentDirection`
  - `PaymentId`
  - `PaymentStatus`
  - `PaymentType`
  - `RecipientAccountNumber`
  - `RecipientAddress`
  - `RecipientName`
  - `RecipientTaxId`
  - `SenderAccountNumber`
  - `SenderAddress`
  - `SenderName`
  - `SenderTaxId`
  - `SplitPayment`
  - `Title`
  - `UpdateDate`
  - `VatAmount`

## Payment status caution

- Probe endpoint: `GET /api2/public/v1.4/payments?$top=1`
- Observed status in safe probe:
  - `400`
- Observed error-envelope keys:
  - `Code`
  - `Message`

Interpretation:

- Treat `payments` separately from `paymentdetails`
- Do not assume `?$top=1` works identically for every endpoint family

## Print endpoint caution

- Probe endpoint: `GET /api2/public/v1.4/invoices/1/print`
- Observed status in safe probe:
  - `400`
- Observed error-envelope keys:
  - `Code`
  - `Data`
  - `Message`

Interpretation:

- Print endpoints have a different operational shape than ordinary JSON
  collection reads
- On success they should be treated as document/download style operations, not
  standard entity-list responses

## Safety rule

These contract notes were derived without persisting tenant business values.
Keep future Betterfly contract validation metadata-only.
