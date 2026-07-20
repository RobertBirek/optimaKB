# Diagramy interfejsu COM dla Comarch ERP Optima
- draftId: `draft_2026-07-08_3386cae6_diagramy-interfejsu-com-dla-comarch-erp-optima`
- kbNamespace: `ComarchOptimaReference`
- status: `promoted`
- promotedAt: `2026-07-10T06:01:31.768Z`
- tags: `COM interfejs`, `diagramy`, `API`, `Optima`, `Mermaid`, `architektura`, `dokumentacja techniczna`
- reviewNote: Approved from daily ops
## Content
# Comarch ERP Optima — Interop (COM API) — Diagramy (Mermaid)

Diagramy uzupełniające bazę wiedzy `KB_Interop_Comarch_Optima.md`.
Wersja produktu: **2026.5.1.6382** · 38 assembly .NET (COM Interop).

---

## 1. Przepływ inicjalizacji i sesji (punkt wejścia)

Typowa sekwencja od uruchomienia po operacje na obiektach biznesowych.

```mermaid
flowchart TD
    A["Klient .NET / VBA / COM"] --> B["ApplicationClass<br/>(ICDNBase)"]
    B -->|"Login / LoginOpe"| C["Uwierzytelnienie operatora<br/>+ licencja HASP/klucz"]
    C -->|"Login2Firm"| D["Wybór bazy firmy"]
    D --> E["ILogin.CreateSession()<br/>sesja z transakcją"]
    E -->|"CreateObject('CDNxxx.KolekcjaClass')"| F["Kolekcja obiektów<br/>biznesowych"]
    F --> G["Pobierz / dodaj element"]
    G --> H["Ustaw właściwości"]
    H --> I["Verify() — walidacja"]
    I -->|"OK"| J["Zapis (Save / metoda kolekcji)"]
    I -->|"Błąd"| H
    J --> K["Commit / Rollback sesji"]
```

---

## 2. Architektura warstwowa

Moduły ułożone w warstwy: od fundamentu po moduły dziedzinowe.

```mermaid
flowchart TB
    subgraph EXT["Zewnętrzne (Microsoft)"]
        ADODB["ADODB"]
        SHD["SHDocVw / AxSHDocVw"]
    end

    subgraph FUND["Fundament"]
        LIB["ICDNLib<br/>narzędzia"]
        BASE["ICDNBase<br/>aplikacja / sesja / login"]
        CONST["ICDNConst<br/>słowniki systemowe"]
        KONF["ICDNKONFIGLib<br/>konfiguracja"]
    end

    subgraph SHARED["Dane wspólne / konfiguracja"]
        HEAL["ICDNHeal<br/>dane podstawowe"]
        HEAL2["ICDNHeal2<br/>konfig. rozszerzona"]
        OSAY["ICDNOSAY<br/>opis analityczny"]
    end

    subgraph DOMAIN["Moduły dziedzinowe"]
        HLMN["ICDNHlmn — Handel"]
        TWR1["ICDNTwrb1 — Towary"]
        TWR2["IOP_Twrb2Lib — Towary 2"]
        KASBO["IOP_KASBOLib — Kasa/Bank"]
        KH["ICDNKH — Księga Handlowa"]
        DAVE["ICDNDave — Księgowość"]
        KPRR["ICDNKPRR — KPiR"]
        RVAT["ICDNRVAT — Rejestry VAT"]
        SCHEM["ICDNSchematy — Schematy"]
        SRTB["ICDNSrtb — Środki Trwałe"]
        PRAC["ICDNPrac — Kadry"]
        PLCFG["ICDNPlcfg — Konfig. Płac"]
        WYPB["ICDNWypb — Wypłaty"]
        SLOW["ICDNSlow — Słowniki kadr."]
        KALB["IOP_KALBLib — Czas pracy"]
        KALB2["IOP_KALB2Lib — RCP/Atrybuty"]
        DEKL["ICDNDeklaracje — Deklaracje"]
        CCRM["IOP_CCRMLib — CRM"]
        CSRS["IOP_CSRSLib — Serwis"]
        SEK["IOP_SEKLib — Obieg dok."]
        DBIMP["IOP_DBIMPLib — Import/Eksport"]
        IMPEXP["IOP_IMPEXPLib — Praca rozproszona"]
        MAIL["ICDNMail — Poczta/SMS"]
    end

    ADODB --> LIB
    LIB --> BASE
    BASE --> HEAL
    HEAL --> HEAL2
    FUND --> SHARED
    SHARED --> DOMAIN
    BASE --> DOMAIN
```

---

## 3. Istotne zależności międzymodułowe

Zależności dziedzinowe (pominięto wszechobecny fundament `ICDNBase` / `ICDNLib` / `ICDNHeal`, aby uwidocznić powiązania biznesowe). Strzałka **A → B** = „B używa A".

```mermaid
flowchart LR
    OSAY["ICDNOSAY"] --> KH["ICDNKH"]
    DAVE["ICDNDave"] --> KH
    DAVE --> SCHEM["ICDNSchematy"]
    KH --> SCHEM
    KH --> RVAT["ICDNRVAT"]
    KPRR["ICDNKPRR"] --> RVAT
    HEAL2["ICDNHeal2"] --> RVAT
    KASBO["IOP_KASBOLib"] --> RVAT
    KASBO --> KH
    KASBO --> HLMN["ICDNHlmn"]
    KASBO --> DEKL["ICDNDeklaracje"]
    KASBO --> PRAC["ICDNPrac"]
    KASBO --> WYPB["ICDNWypb"]
    KASBO --> CCRM["IOP_CCRMLib"]
    KASBO --> CSRS["IOP_CSRSLib"]
    HLMN --> TWR1["ICDNTwrb1"]
    HLMN --> CCRM
    HLMN --> CSRS
    TWR1 --> KPRR
    TWR1 --> MAIL["ICDNMail"]
    TWR1 --> CCRM
    TWR1 --> CSRS
    PRAC --> KPRR
    PRAC --> WYPB
    PRAC --> DEKL
    PLCFG["ICDNPlcfg"] --> PRAC
    PLCFG --> WYPB
    PLCFG --> SLOW["ICDNSlow"]
    PLCFG --> KALB["IOP_KALBLib"]
    SLOW --> PRAC
    KALB --> PRAC
    KALB --> WYPB
    KALB --> KALB2["IOP_KALB2Lib"]
    HEAL2 --> HLMN
    HEAL2 --> KH
    HEAL2 --> KASBO
    CONST["ICDNConst"] --> KALB
```

---

## 4. Mapa obszarów biznesowych

```mermaid
mindmap
  root(("Comarch Optima<br/>Interop API"))
    Rdzeń
      ICDNBase — aplikacja/sesja
      ICDNLib — narzędzia
      ICDNConst — słowniki systemowe
      ICDNKONFIGLib — konfiguracja
      ICDNBaseW — kreatory/login
    Księgowość
      ICDNKH — Księga Handlowa
      ICDNDave — dzienniki/e-Sprawozdania
      ICDNKPRR — KPiR/ryczałt
      ICDNSchematy — schematy księgowe
      ICDNRVAT — Rejestry VAT
      ICDNR2R — rozrachunki
      ICDNDeklaracje — deklaracje/ZUS
    Handel
      ICDNHlmn — dokumenty handlowe
      ICDNTwrb1 — towary/cennik
      IOP_Twrb2Lib — marki/producenci
      IOP_KASBOLib — kasa/bank
    Kadry i Płace
      ICDNPrac — kadry
      ICDNWypb — wypłaty
      ICDNPlcfg — konfiguracja płac
      ICDNSlow — słowniki kadrowe
      IOP_KALBLib — czas pracy
      IOP_KALB2Lib — RCP/atrybuty
    Majątek
      ICDNSrtb — środki trwałe
      ICDNOSAY — opis analityczny
    CRM i Serwis
      IOP_CCRMLib — CRM
      IOP_CSRSLib — zlecenia serwisowe
      IOP_SEKLib — obieg dokumentów
    Integracje
      IOP_DBIMPLib — import/eksport
      IOP_IMPEXPLib — praca rozproszona
      ICDNMail — poczta/SMS
      ICDN_EXPCLib — Excel
      IZIPMODLib — ZIP
```

---

## 5. Wzorzec pracy z obiektem biznesowym (dokument nagłówek/element)

```mermaid
sequenceDiagram
    participant K as Klient
    participant S as Sesja (ILogin)
    participant Kol as Kolekcja (DokumentyHaMag)
    participant Nag as Nagłówek (IDokumentHaMag)
    participant El as Element (IElementHaMag)

    K->>S: CreateObject("CDNHlmn.DokumentyHaMagClass")
    S-->>K: Kolekcja
    K->>Kol: AddNew() / pobierz dokument
    Kol-->>Nag: nowy nagłówek
    K->>Nag: ustaw pola (data, kontrahent, magazyn)
    K->>Nag: DodajElementyDoDokumentu()
    Nag-->>El: nowy element
    K->>El: ustaw towar, ilość, cenę
    El->>El: PrzeliczWgTowaru() / ObliczNettoBrutto()
    K->>Nag: PrzeliczAgregaty()
    K->>Nag: Verify()
    alt walidacja OK
        K->>S: zapis + Commit
    else błąd
        Nag-->>K: komunikat błędu
    end
```

---

## 6. Cykl księgowania dokumentu

```mermaid
flowchart LR
    DOK["Dokument źródłowy<br/>(Handel / VAT / KB)"] --> SCH["ISzablonDekretacji<br/>(ICDNSchematy)"]
    SCH --> SERW["ISerwisKsiegowy.KsiegujDokument<br/>(ICDNKH)"]
    SERW --> DEK["Dekret<br/>(IDekret)"]
    DEK -->|"NumerujDekret / Ksieguj"| KSIEGA["Zapis w dzienniku<br/>(ICDNDave)"]
    DEK --> ROZR["Rozrachunki<br/>(IRozrachunkiManager)"]
    KSIEGA --> ZEST["Zestawienia / OiS<br/>obroty i salda"]
```