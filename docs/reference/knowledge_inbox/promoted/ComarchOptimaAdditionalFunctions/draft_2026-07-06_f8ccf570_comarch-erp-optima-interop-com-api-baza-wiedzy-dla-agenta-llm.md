# Comarch ERP Optima — Interop (COM API) — Baza wiedzy dla agenta LLM
- draftId: `draft_2026-07-06_f8ccf570_comarch-erp-optima-interop-com-api-baza-wiedzy-dla-agenta-llm`
- kbNamespace: `ComarchOptimaAdditionalFunctions`
- status: `promoted`
- promotedAt: `2026-07-07T05:47:40.513Z`
- tags: `interop`, `com-api`, `comarch-optima`, `dll`, `reference`, `2026.5.1`
- reviewNote: Approved from inbox row
## Content
# Comarch ERP Optima — Interop (COM API) — Baza wiedzy dla agenta LLM

> Automatycznie wygenerowana baza wiedzy z analizy plików `.dll` w katalogu `Interop`.
> Data analizy: **2026-07-06** · Wersja produktu: **2026.5.1.6382** · Framework: **.NET COM Interop**

---

## 1. Czym jest ten zestaw bibliotek

Katalog `Interop` zawiera **38 zarządzanych assembly .NET** będących **COM Interop wrapperami** (tzw. *Interop Assemblies*) do silnika biznesowego **Comarch ERP Optima**. Każdy plik `ICDN*.dll` / `IOP_*.dll` to wygenerowana z natywnej biblioteki COM (ATL) biblioteka typów, która udostępnia obiekty biznesowe Optimy (dokumenty, kartoteki, słowniki, serwisy) do automatyzacji z poziomu kodu .NET (C#/VB.NET), VBA lub innych klientów COM.

Trzy pliki to **standardowe biblioteki Microsoftu**, nie Comarch: `adodb.dll` (ADO — dostęp do danych), `Interop.SHDocVw.dll` i `AxInterop.SHDocVw.dll` (kontrolka WebBrowser / Internet Explorer).

**Model użycia (typowy przepływ):**

```
ApplicationClass  ->  Login (uwierzytelnienie, wybór bazy/firmy)
      |
      v
  ILogin.CreateSession()   ->  sesja z transakcją na bazie firmy
      |
      v
  Session.CreateObject("CDNxxx.KolekcjaClass")  ->  kolekcja obiektów biznesowych
      |
      v
  obiekt.pola / obiekt.Verify() / kolekcja.Dodaj()  ->  operacje CRUD + walidacja
```

---

## 2. Konwencje nazewnictwa (ważne dla nawigacji po API)

| Wzorzec | Znaczenie | Przykład |
|---|---|---|
| `I<Nazwa>` | **Interfejs COM** obiektu biznesowego — tu są właściwości i metody | `IDokumentHaMag`, `IPracownik` |
| `<Nazwa>Class` | **Koklasa** (konkretna implementacja) tworzona przez `CreateObject` | `WyplataClass` |
| `<Nazwa>` (l.poj.) | Pojedynczy obiekt/rekord | `Wyplata`, `Konto` |
| `<Nazwa>y` / `<Nazwa>i` (l.mn.) | **Kolekcja** obiektów (lista, iteracja, dodawanie) | `Wyplaty`, `Konta`, `Deklaracje` |
| `Serwis<X>` / `ISerwis<X>` | **Serwis** — logika operacyjna (księgowanie, wyliczenia, import) | `ISerwisKsiegowy`, `ISerwisAmortyzacji` |
| `Cfg<X>` / `<X>Enum` | Obiekty konfiguracyjne / typy wyliczeniowe | `CfgStawka`, `StatusDelegacjiEnum` |
| Namespace `CDN<Skrót>` / `OP_<Skrót>Lib` | Przestrzeń nazw modułu | `CDNHlmn`, `OP_KASBOLib` |

Nazwy typów i metod są w **języku polskim** (domena księgowo-kadrowa), np. `Ksieguj`, `PrzeliczAgregaty`, `Verify`.

---

## 3. Mapa modułów (plik → obszar biznesowy)

### Moduły Comarch ERP Optima

| Plik DLL | Obszar | Typy publ. / interfejsy | Rola |
|---|---|---|---|
| `ICDNBase.dll` | Rdzeń / sesja | 121 / 72 | Punkt wejścia całego API. Zarządza aplikacją, logowaniem, sesjami, połączeniami z bazą, firmami, konfiguracją i licencjami (HASP/klucz). |
| `ICDNBaseW.dll` | Rdzeń / UI | 11 / 7 | Kreatory i ekrany logowania (warstwa okien). |
| `ICDNConst.dll` | Słowniki systemowe | 127 / 74 | Stałe i słowniki systemowe: kraje, formaty NIP, typy kont/okresów/podmiotów, kasy chorych, pozycje ZUS, definicje importu XML. |
| `ICDNDave.dll` | Księgowość / ewidencja | 69 / 45 | Dzienniki księgowe, okresy obrachunkowe, projekty, sprawozdania finansowe (e-Sprawozdania), zestawienia księgowe. |
| `ICDNDeklaracje.dll` | Deklaracje | 183 / 72 | Deklaracje podatkowe i ZUS: e-Deklaracje, KEDU, DRA, PIT, CIT, CUK, PPK, generowanie PDF/XML deklaracji. |
| `ICDNHeal.dll` | Dane podstawowe / konfiguracja | 244 / 156 | Główna biblioteka danych podstawowych: definicje dokumentów, grupy, atrybuty, adresy, banki, kategorie, słowniki konfiguracyjne, kody JPK_V7. |
| `ICDNHeal2.dll` | Konfiguracja rozszerzona | 186 / 115 | Cenniki i stawki VAT, odsetki (ustawowe/podatkowe), kurierzy i paczki, działy, diety/ryczałty/limity, moduły operatora, stanowiska. |
| `ICDNHlmn.dll` | Handel / Magazyn | 138 / 84 | Dokumenty handlowo-magazynowe, elementy, dostawy, kaucje, awiza, fiskalizacja i drukarki fiskalne, obsługa KSeF. |
| `ICDNKH.dll` | Księga Handlowa | 92 / 57 | Pełna księgowość: konta, dekrety, bilanse, rozrachunki, dokumenty KSI, obroty i salda (OiS), serwisy księgujące i kontrolne. |
| `ICDNKONFIGLib.dll` | Konfiguracja klucz-wartość | 19 / 12 | Generyczny rejestr konfiguracji (klucze/wartości) — odczyt i zapis parametrów. |
| `ICDNKPRR.dll` | Księga Podatkowa (KPiR/ryczałt) | 42 / 26 | Uproszczona księgowość: zapisy KPiR, ryczałt, remanenty, wynagrodzenia uproszczone, DPD. |
| `ICDNLib.dll` | Biblioteka narzędziowa | 88 / 38 | Narzędzia bazowe: słowniki (Dictionary), macierze, okresy (Period/MonthYear), logi wydajności, trace, adaptery UI/zdarzeń. |
| `ICDNMail.dll` | Poczta / SMS | 46 / 27 | Konta e-mail operatora, wiadomości, foldery, podpisy i certyfikaty, wysyłka SMS (OptimaSms). |
| `ICDNOSAY.dll` | Opis analityczny | 21 / 12 | Wymiarowanie / opis analityczny dokumentów (rozksięgowanie na wymiary). |
| `ICDNPlcfg.dll` | Konfiguracja Płac | 144 / 45 | Definicje płacowe: typy składników wynagrodzeń, wzorce, grupy potrąceń, akordy, e-teczka i certyfikaty, parametry. |
| `ICDNPrac.dll` | Kadry | 145 / 92 | Pracownicy i dane kadrowe: etaty, absencje, dodatki, akordy, działy, centra podległościowe, harmonogramy, historia zapisów. |
| `ICDNR2R.dll` | Rozrachunki | 6 / 4 | Rozrachunki i rozliczenia typu R2R (rozrachunek↔rozliczenie). |
| `ICDNRVAT.dll` | Rejestry VAT | 82 / 45 | Rejestry VAT (zakup/sprzedaż), ewidencja dodatkowa, delegacje krajowe/zagraniczne, atrybuty VAT, dane KSeF, struktura zakupów. |
| `ICDNResPr.dll` | Zasoby (helper) | 30 / 8 | Dostawca zasobów/tłumaczeń (ResourceProvider) — COM helper. |
| `ICDNSchematy.dll` | Schematy księgowe | 86 / 53 | Automatyzacja księgowań: schematy i szablony dekretacji, kręgi kosztów, budżety kont, księgowania okresowe, przeszacowanie walut, zestawienia wyliczane. |
| `ICDNSlow.dll` | Słowniki kadrowe | 217 / 124 | Słowniki kadrowo-płacowe (kody GUS/zawodów, PFRON, przyczyny zwolnień, schorzenia, stanowiska, uprawnienia, pracodawcy, koszty). |
| `ICDNSrtb.dll` | Środki Trwałe | 122 / 76 | Środki trwałe i wyposażenie: amortyzacja, dokumenty ST, reklasyfikacje, przejazdy i samochody, KRŚT, atrybuty. |
| `ICDNTwrb1.dll` | Towary / Cennik (cz.1) | 143 / 88 | Kartoteki towarowe i cennik: towary, ceny, atrybuty, receptury, Intrastat, kody CN, rabaty, spis z natury, dane binarne, e-Sklep. |
| `ICDNWypb.dll` | Wypłaty / Listy płac | 54 / 28 | Naliczanie wynagrodzeń: wypłaty, listy płac, elementy i składniki wypłaty, podatki, zbiorcze płatności, opisy kadry/płace. |
| `ICDN_EXPCLib.dll` | Eksport / Excel | 30 / 9 | Eksport do Excela i kalkulator (ExcelApp / CalcApp). |
| `IOP_CCRMLib.dll` | CRM | 103 / 65 | CRM: ankiety i wzorce ankiet, faktury i dokumenty cykliczne, automaty windykacji, uczestnicy. |
| `IOP_CSRSLib.dll` | Serwis | 52 / 32 | Zlecenia serwisowe: urządzenia, czynności, części, cykle, faktury serwisowe, etapy i relacje dokumentów. |
| `IOP_DBIMPLib.dll` | Import / Eksport | 105 / 72 | Import i eksport danych: z Excela, baz, KEDU, banków, urzędów, GUS; cenniki, e-Sklep, kursy NBP, integracja iBard, aktualizacje web. |
| `IOP_IMPEXPLib.dll` | Praca rozproszona | 12 / 7 | Eksport/import offline (praca rozproszona) i konfiguracja baz. |
| `IOP_KALB2Lib.dll` | Kalendarze / RCP (cz.2) | 101 / 56 | Atrybuty i ich klasy/grupy, RCP (rejestracja czasu pracy), karty i limity pracownika, podstawy wyliczeń, serwisy atrybutów/limitów. |
| `IOP_KALBLib.dll` | Kalendarze / Czas pracy | 133 / 68 | Czas pracy: plany i kalendarze, dni/godziny pracy i planu, nieobecności, strefy, dni świąteczne, zestawienia czasu pracy, zwolnienia ZUS. |
| `IOP_KASBOLib.dll` | Kasa / Bank | 164 / 103 | Kasa i bank: banki, przelewy (import/eksport, formaty wymiany, SEPA), dokumenty KK/KB/MW, formy płatności, autoryzacja przelewów, odsetki, bilans otwarcia. |
| `IOP_SEKLib.dll` | Obieg dokumentów | 61 / 38 | Obieg dokumentów (SEK): dokumenty i etapy, schematy obiegu, katalogi, historia i pliki załączników. |
| `IOP_Twrb2Lib.dll` | Towary (cz.2) | 51 / 33 | Uzupełnienie kartotek towarowych: marki, producenci, PKWiU, kontrola braków, waga sklepowa, konfiguracja e-Sklep (magazyny/stanowiska/waluty). |
| `IZIPMODLib.dll` | Narzędzie ZIP | 4 / 3 | Kompresja/dekompresja plików (ZipTool). |

### Biblioteki zewnętrzne (Microsoft — nie Comarch)

| Plik DLL | Obszar | Rola |
|---|---|---|
| `AxInterop.SHDocVw.dll` | Zewnętrzne (MS) | ActiveX wrapper kontrolki WebBrowser (AxSHDocVw) — standardowe MS interop. |
| `Interop.SHDocVw.dll` | Zewnętrzne (MS) | Interop kontrolki WebBrowser / Internet Explorer (SHDocVw) — standardowe MS interop. |
| `adodb.dll` | Zewnętrzne (MS ADO) | Microsoft ActiveX Data Objects — standardowa biblioteka dostępu do danych (nie Comarch). Używana przez warstwę AdoSession. |

---

## 4. Rdzeń — punkt wejścia (`ICDNBase.dll`)

To **obowiązkowy punkt startowy** każdej integracji. Kluczowe interfejsy i wybrane metody:

- **`IApplication`** — logowanie i cykl życia aplikacji: `RegisterFirm, UnregisterFirm, Login, LockApp, UnlockApp, LoginOpe, VerifyBase, LoginOut, HASPGetLicenceStateInfo, HASPGetLicenceOptionInfo, Login2Firm, SHA1, CodeBase, MakeBase, Refresh, LoginDomain` …
- **`IFirm`** — zarządzanie bazą firmy: `Create, Remove, Backup, Restore, RenameDatabase, Convert, ReIndex, DestroyConnection, ExecuteFromFile, ChangeSAPassword, UpdateNameServers, GetCacheRecordset, FlushCacheRecordset, UpdateDatabase, DisconnectDatabase, VerifySystemCDN` …
- **`IDatabase`** — operacje na bazie danych: `Create, Remove, Backup, Restore, RenameDatabase, Convert, ReIndex, DestroyConnection, ExecuteFromFile, ChangeSAPassword, UpdateNameServers, GetCacheRecordset, FlushCacheRecordset, CheckSqlVersion, ExecuteFromString, BackupEx` …
- **`ILogin`** — tworzenie sesji i obiektów biznesowych: `GetConnection, PushBackConnection, CreateSession, CreateObject, ClearState, DateToday, SetContextInfo, CreateSessionInDatabase, TablesSizeLimitExceededEx, GetDataSizesCompany`
- **`IConfiguration`** — baza konfiguracyjna: `Create, Remove, Backup, Restore, RenameDatabase, Convert, ReIndex, DestroyConnection, ExecuteFromFile, ChangeSAPassword, UpdateNameServers, GetCacheRecordset, FlushCacheRecordset, AddAdminIfNone, RestoreStdPrintouts, RestoreStdAnalyses` …

Najważniejsze metody wejścia: `IApplication.Login` / `LoginOpe` (uwierzytelnienie operatora), `ILogin.CreateSession` (otwarcie sesji z transakcją), `ILogin.CreateObject` (instancjonowanie kolekcji/obiektów biznesowych).

---

## 5. Wspólne wzorce API (do stosowania przez agenta)

- **`Verify()`** — niemal każdy obiekt biznesowy ma metodę `Verify()` walidującą stan przed zapisem. Wywołuj przed utrwaleniem.
- **Para kolekcja/element** — dane organizowane są jako kolekcja (l.mn.) zawierająca elementy (l.poj.), np. `Wyplaty` → `Wyplata`, `DokumentyHaMag` → `DokumentHaMag`, `Konta` → `Konto`.
- **Nagłówek/element** — dokumenty mają nagłówek (`...Nag`) i pozycje (`...Elem`/`Element`), np. `IDokumentDostawyNag` + `IDokumentDostawyElem`.
- **Serwisy** — operacje złożone (księgowanie, amortyzacja, import, wyliczenia płac) realizują obiekty `ISerwis*`, często z raportowaniem postępu (`AdviseProgress`/`ActionCompleted`).
- **`InitializeClone` / `InitializeParent`** — inicjalizacja obiektów przy kopiowaniu lub w kontekście rodzica.
- **Zdarzenia COM** — interfejsy `_I...Events` (np. `_IProgressEvents`, `_IOptimaSmsEvents`) to punkty połączeń (connection points) do obsługi zdarzeń.

---

## 6. Zależności między assembly

Referencje między bibliotekami Comarch (pomijając `mscorlib`/`System`):

| Moduł | Zależy od (Comarch) |
|---|---|
| `ICDNBase` | ADODB, ICDNLib |
| `ICDNBaseW` | ICDNBase, ICDNLib |
| `ICDNConst` | ADODB, ICDNBase |
| `ICDNDave` | ADODB, ICDNBase, ICDNHeal, ICDNLib |
| `ICDNDeklaracje` | ADODB, ICDNBase, ICDNHeal, ICDNHeal2, ICDNLib, ICDNPrac, IOP_KASBOLib |
| `ICDNHeal` | ADODB, ICDNBase, ICDNLib |
| `ICDNHeal2` | ADODB, ICDNBase, ICDNHeal, ICDNLib |
| `ICDNHlmn` | ADODB, ICDNBase, ICDNHeal, ICDNHeal2, ICDNLib, IOP_KASBOLib |
| `ICDNKH` | ADODB, ICDNBase, ICDNDave, ICDNHeal, ICDNHeal2, ICDNLib, ICDNOSAY, IOP_KASBOLib |
| `ICDNKONFIGLib` | ICDNBase, ICDNLib |
| `ICDNKPRR` | ADODB, ICDNBase, ICDNHeal, ICDNLib, ICDNPrac, ICDNTwrb1 |
| `ICDNLib` | ADODB |
| `ICDNMail` | ADODB, ICDNBase, ICDNHeal, ICDNLib, ICDNTwrb1 |
| `ICDNOSAY` | ADODB, ICDNBase, ICDNHeal, ICDNLib |
| `ICDNPlcfg` | ADODB, ICDNBase, ICDNHeal, ICDNLib |
| `ICDNPrac` | ADODB, ICDNBase, ICDNHeal, ICDNLib, ICDNPlcfg, ICDNSlow, IOP_KALBLib, IOP_KASBOLib |
| `ICDNR2R` | ADODB, ICDNBase, ICDNLib |
| `ICDNRVAT` | ADODB, ICDNBase, ICDNHeal, ICDNHeal2, ICDNKH, ICDNKPRR, ICDNLib, IOP_KASBOLib |
| `ICDNSchematy` | ADODB, ICDNBase, ICDNDave, ICDNHeal, ICDNKH, ICDNLib |
| `ICDNSlow` | ADODB, ICDNBase, ICDNHeal, ICDNLib, ICDNPlcfg |
| `ICDNSrtb` | ADODB, ICDNBase, ICDNHeal, ICDNLib |
| `ICDNTwrb1` | ADODB, ICDNBase, ICDNHeal, ICDNHlmn, ICDNLib |
| `ICDNWypb` | ADODB, ICDNBase, ICDNHeal, ICDNLib, ICDNPlcfg, ICDNPrac, IOP_KALBLib, IOP_KASBOLib |
| `IOP_CCRMLib` | ADODB, ICDNBase, ICDNHeal, ICDNHlmn, ICDNLib, ICDNTwrb1, IOP_KASBOLib |
| `IOP_CSRSLib` | ADODB, ICDNBase, ICDNHeal, ICDNHlmn, ICDNLib, ICDNTwrb1, IOP_KASBOLib |
| `IOP_DBIMPLib` | ADODB, ICDNBase, ICDNLib |
| `IOP_IMPEXPLib` | ADODB, ICDNBase, ICDNLib |
| `IOP_KALB2Lib` | ADODB, ICDNBase, ICDNLib, IOP_KALBLib |
| `IOP_KALBLib` | ADODB, ICDNBase, ICDNConst, ICDNLib, ICDNPlcfg |
| `IOP_KASBOLib` | ADODB, ICDNBase, ICDNHeal, ICDNHeal2, ICDNLib |
| `IOP_SEKLib` | ADODB, ICDNBase, ICDNHeal, ICDNLib |
| `IOP_Twrb2Lib` | ADODB, ICDNBase, ICDNHlmn, ICDNLib |

`ICDNBase` / `ICDNLib` / `ICDNHeal` stanowią warstwę bazową, od której zależy większość modułów dziedzinowych.

---

## 7. Uwagi dla agenta

- API jest **stanowe i transakcyjne** — operacje wykonuj w obrębie sesji utworzonej przez `ILogin.CreateSession`.
- Obiekty tworzy się przez **`CreateObject`** z identyfikatorem ProgID w formie `CDN<Modul>.<Nazwa>Class` (COM), nie przez `new`.
- Do zapisu danych zwykle: pobierz/utwórz element w kolekcji → ustaw właściwości → `Verify()` → zapis (metoda kolekcji lub sesji).
- Nazewnictwo polskie; przy szukaniu funkcji kieruj się rdzeniem słowa (`Ksieguj`, `Przelicz`, `Dodaj`, `Usun`, `Ustaw`).
- Ten dokument opisuje **powierzchnię API** (metadane typów). Pełny załącznik z wykazem wszystkich interfejsów, koklas i typów wyliczeniowych każdego modułu znajduje się w źródłowym pliku `KB_Interop_Comarch_Optima.md`.

---

*Uwaga: pełna wersja dokumentu zawiera dodatkowo Załącznik (sekcja 7) z wyczerpującym wykazem wszystkich interfejsów biznesowych, koklas i typów wyliczeniowych dla każdego z 35 modułów Comarch.*