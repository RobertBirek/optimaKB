# OptimaWorker DLL and COM capability map
- draftId: `draft_2026-06-20_762ac060_optimaworker-dll-and-com-capability-map`
- kbNamespace: `ComarchOptimaPartnerTechnical`
- status: `promoted`
- promotedAt: `2026-06-20T18:34:07.228Z`
- tags: `optima`, `com`, `interop`, `dll`, `worker`, `capability-map`
- reviewNote: Approved and exported from dashboard
## Content
# OptimaWorker DLL and COM capability map

Source of truth in repo: `docs/optima-worker-dll-com-map.md`.

## Purpose
This draft documents the current `OptimaWorker` COM interop surface used by the OptimaWebApi project. It focuses on:
- which COM interop DLLs are present and referenced,
- which COM business objects are actually instantiated at runtime,
- how public API request DTOs map to COM properties,
- which capabilities are active, inactive, or absent.

## High-level findings
- `OptimaWorker.csproj` contains 38 unique interop references (`ICDN*`, `IOP_*`, `IZIPMODLib`, `ADODB`).
- The interop folder also contains `AxInterop.SHDocVw.dll` and `Interop.SHDocVw.dll`, but the worker does not reference them.
- Runtime COM login uses `CDNBase.Application` and `CDNBase.AdoSession` via `OptimaComSession`.
- The worker uses `dynamic` and `CreateObject("...")` for business objects.
- Read/display is not done through COM in this project; public GET endpoints use the SQL read store.
- Delete/remove capabilities are absent.
- `ConfigUpdate` is the only explicit update flow.
- `NotificationCreate` and `R2REntryCreate` exist in code/tests but are not registered in the default runtime registry.

## KB-backed semantic anchors
The KB already contains practical guidance for the same areas:
- `ComarchOptimaAdditionalFunctions`: COM patterns for trade documents, accounting decree import, dictionaries, attributes, and example scripts touching `Kontrahenci`, `CRMKontakty`, `EwidDodNag`, `EwidDodElem`.
- `ComarchOptimaPartnerTechnical`: partner COM module recipes for `trade_warehouse`, `accounting`, `cash_bank`, `general_com`, `prints_reporting`; sample types include `IApplication`, `ILogin`, `IAdoSession`, `ITowar`, `IDekret`, `IKonto`, `IFormaPlatnosci`.
- `ComarchOptimaSchema`: SQL touchpoints used to cross-check business object meaning and persistence shape.

## Runtime coverage summary
### Active processors
- `BaseOperation` -> `CDN.SystemCDN`
- `ConfigUpdate` -> `CDN.KonfigText`
- `ConstantCreate` -> `CDN.Parametry`
- `PlConfigCreate` -> `CDN.KonfigText`
- `ContractorCreate` -> `CDN.Kontrahenci`
- `AdditionalContractorDataCreate` -> `CDN.DetalKontrahenci`
- `CrmContactCreate` -> `CDN.CRMKontakty`
- `EmployeeCreate` -> `CDN.Pracownicy`
- `ItemCreate` / `ExtendedItemCreate` -> `CDN.Towary`
- `InvoiceCreate` -> `CDN.DokumentyHaMag`
- `PaymentCreate` -> `KASA.DokumentyKasowe`
- `DocumentImport` -> session document import flow
- `DeclarationCreate` -> `CDN.DeklNag`
- `JournalEntryCreate` -> `CDN.Dekrety`
- `JournalPeriodCreate` -> `CDN.Dzienniki`
- `KpiREntryCreate` -> `CDN.ZapisyKPR`
- `VatRegisterCreate` -> `CDN.VatNag`
- `SchemaTemplateCreate` -> `CDN.Wzorce`
- `ServiceOrderCreate` -> `CDN.ZleceniaSerwisowe`
- `WarehouseReleaseCreate` -> `CDN.WypElementy`
- `ProductionOrderCreate` -> `CDN.ProdElem`
- `DiscountCreate` -> `CDN.Rabaty`
- `FixedAssetCreate` -> `CDN.Trwale`
- `DictionaryGroupCreate` -> `CDN.Slowniki`
- `EmailSend` -> `CDN.Mail`
- `ExportCreate` -> `CDN.EksportyNag`
- `DbImportCreate` -> `CDN.ImportyNag`
- `ImportExportJobCreate` -> `CDN.ImportEksportNag`
- `CalendarEntryCreate` / `Calendar2EntryCreate` -> `CDN.Kalendarze`
- `SekReadingCreate` -> `CDN.OdczytyNag`
- `ZipOperationCreate` -> `CDN.ArchiwumZip`
- `AxEntryCreate` -> `CDN.AXEntity`

### Implemented but inactive
- `NotificationCreate` -> `CDN.RejestrOperacji`
- `R2REntryCreate` -> `CDN.ZestKsiNag`

## DTO and variable map
The project has explicit request DTOs for all operations in `src/PublicApi/Services/ImportContracts.cs`. The worker maps them directly to COM properties. The full field list is documented in the repo file, but the important shape is:
- contractor / CRM / employee / item / invoice / payment / import / accounting / VAT / calendar / export / zip / AX flows all have typed DTOs,
- nested line DTOs exist for `InvoiceOperationRequest` and `ImportDocumentRequest`,
- optional fields are represented as nullable strings/numbers/bools and are conditionally written to COM properties.

## Representative COM property patterns
- contractor: `Akronim`, `Nazwa1`, `Email`, `Telefon1`, `Adres.*`
- item: `Kod`, `Nazwa`, `JM`, `Stawka`, `TwGGIDNumer`
- invoice: `TypDokumentu`, `DataDok`, `Podmiot.Kod`, `Elementy.AddNew()`, `TwrKod`, `Ilosc`, `Cena`, `Stawka`
- payment: `Rodzaj`, `DataDok`, `Podmiot.Kod`, `Kwota`, `Opis`
- accounting: `Dk_*`, `Dz_*`, `Kpr_*`, `Vn_*`, `Zk_*`, `Od_*`

## Coverage matrix
- Read/display through COM: not present.
- Create/add through COM: dominant capability.
- Update/edit through COM: only `ConfigUpdate` is a real update flow.
- Delete/remove through COM: not present.

## Gaps
- `SHDocVw` wrappers are present in the interop folder, but not used by the worker.
- Some DLLs appear in the csproj without a direct `CreateObject` call in the current runtime code; their semantics are inferred from KB/module names.
- To make the map fully exhaustive, the next step would be deeper metadata extraction of the interop assemblies and/or adding more Comarch source documents to the KB.