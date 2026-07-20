# Interop COM w Comarch ERP Optima
- draftId: `draft_2026-07-08_13d00645_interop-com-w-comarch-erp-optima`
- kbNamespace: `ComarchOptimaPartnerTechnical`
- status: `promoted`
- promotedAt: `2026-07-10T06:01:31.672Z`
- tags: `Interop COM`, `DLL`, `Integracja techniczna`, `Comarch ERP Optima`, `Środowisko COM`
- reviewNote: Approved from daily ops
## Content
# KB: Comarch ERP Optima COM Interop

## Interop DLLs

Ścieżka: `C:\Program Files\Comarch ERP Optima\Interop\`

| DLL | Główne typy COM |
|-----|----------------|
| **ICDNBase.dll** | `IApplication` — główna aplikacja |
| **ICDNHeal.dll** | `IKontrahent`, `IKntWeryfRach`, `IKntWeryfStat`, `IKntZamknMies`, `IKntOdbiorca`, `IKntESklep` |
| **ICDNTwrb1.dll** | `ITowar`, `IKntAtrybut`, `ITwrKntAtrybut` |
| **ICDNHlmn.dll** | `IDokumentHaMag`, `IMagazyn`, `Magazyny` |
| **ICDNHeal2.dll** | `ICfgStawka`, `CfgStawka`, `CfgStawki`, `ICfgStawkaRejestru`, `CfgStawkiPl`, `ICfgDetalZakazyMagazyn`, `IJDPElementKnt` |
| **ICDNDave.dll** | `IDziennik` |
| **ICDNSlow.dll** | `IKasaChor` |
| **IOP_KASBOLib.dll** | `IDokumentKK`, `IDokumentKKElement` |
| **ICDNRVAT.dll** | VAT-related, `IEwidencjaDodatkowa`, `IKwotaDodatkowa` |
| **ICDNKONFIGLib.dll** | Konfiguracja |
| **ICDNPlcfg.dll** | Konfiguracja PL |
| **ICDNDeklaracje.dll** | Deklaracje |
| **ICDNPrac.dll** | Kadry: `IDodatek`, `IDodatekHis` |
| **ICDNWypb.dll** | Płace |
| **ICDNKPRR.dll** | KPiR / Ryczalt |
| **ICDNMail.dll** | Email |
| **ICDNOSAY.dll** | Oś czasu |
| **ICDNResPr.dll** | Rezerwacje |
| **ICDNR2R.dll** | R2R |
| **ICDNSrtb.dll** | Środki trwałe, osoby odpowiedzialne |
| **ICDNKH.dll** | `IKntZakaz` |
| **ICDNSchematy.dll** | Schematy |
| **IOP_Twrb2Lib.dll** | eSklep / Towary rozszerzone |
| **IOP_KALBLib.dll** | Kalendarz |
| **IOP_CCRMLib.dll** | CRM cykliczne |
| **ICDNConst.dll** | Stałe |

## `_comTypeInit` — aktualnie ładowane (Worker V2)

```csharp
typeof(IApplication),       // ICDNBase
typeof(IKontrahent),        // ICDNHeal
typeof(IDokumentHaMag),     // ICDNHlmn
typeof(ITowar),             // ICDNTwrb1
typeof(IDziennik),          // ICDNDave
typeof(IKasaChor),          // ICDNSlow
typeof(ICfgStawka),         // ICDNHeal2
typeof(IDokumentKK),        // IOP_KASBOLib
```

## CO_E_CLASSSTRING — znane problemy

Encje, gdzie `session.CreateObject()` rzuca CO_E_CLASSSTRING mimo załadowania typów:
- Contact (5): `CDN.KntOsoby` — brak typu `IKntOsoba` w żadnym DLL
- Detail (7): `CDN.KntDodatkowe` — brak typu `IKntDodatkowe` w żadnym DLL
- Payment (8): `KASA.DokumentyKasowe` — typ IDokumentKK załadowany, ale ProgID może być inny
- WarehouseDoc (13): `CDN.DokumentyMagazynowe` — typy z ICDNHlmn załadowane

**Hipoteza:** te obiekty COM mogą być tworzone jako sub-kolekcje innych obiektów:
- KntOsoby → `kontrahent.Osoby.AddNew()`
- KntDodatkowe → `kontrahent.Dodatkowe.AddNew()` lub jako osobny obiekt
- DokumentyMagazynowe → może wymagać `typ` do utworzenia

## VAT — ITowar

```csharp
// Stawka (tylko wartość, bez flagi):
ent.Stawka = 23.00m;

// Flaga (2 = 23% standardowa krajowa):
ent.Flaga = 2;

// Stawka zakupu:
ent.StawkaZak = 23.00m;
ent.FlagaZak = 2;

// StawkaVat (obiekt ICfgStawka) — NIE DZIAŁA przez dynamic:
// ent.StawkaVat = cfgStawkaObj; // COM type mismatch
// ent.SetStawkaVatSpr(23);      // hang
```

Znane mapowanie Flaga:
- 23% → Flaga=2
- 8% → Flaga=3 (niepotwierdzone)
- 5% → Flaga=4 (niepotwierdzone)
- 0% → Flaga=6 (niepotwierdzone)

## Invoice lines — Elementy.AddNew

```csharp
dynamic elementy = ent.Elementy;
dynamic ln = elementy.AddNew(null);
ln.StawkaVAT = 23;  // lub ln.Stawka
// Cena, Ilosc, etc.
```

## Warehouse

`CDN.Magazyny` wymaga pola `Rejestr` (nazwa właściwości COM nieznana).
`ICDNHlmn.IMagazyn` — tylko podstawowe właściwości (Symbol?, Nazwa?).