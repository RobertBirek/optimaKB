# Globalny interfejs COM Comarch ERP Optima
- draftId: `draft_2026-07-11_73a7cfe0_globalny-interfejs-com-comarch-erp-optima`
- kbNamespace: `ComarchOptimaReference`
- status: `promoted`
- promotedAt: `2026-07-11T16:36:51.376Z`
- tags: `COM`, `Interop`, `Comarch ERP Optima`, `architektura`, `licencjonowanie`, `logowanie`, `integracja`
- reviewNote: Approved from inbox row
## Content
# KB: Comarch ERP Optima — Global Interop Reference

**Cel:** Uniwersalna dokumentacja Comarch ERP Optima COM Interop — reusable w KAŻDYM projekcie (OptimaWebApi, MCP, custom integracje, AI agenty).

| Metadane | Wartość |
|----------|---------|
| **Wersja Optimy** | 2026.5.1.6382 (64-bit) |
| **Ścieżka Interop** | `C:\Program Files\Comarch ERP Optima\Interop\` |
| **Data audytu** | 2026-07-11 |
| **DLL biznesowych** | 35 |
| **Interfejsy COM** | 820 (z czego ~770 z członkami >0) |
| **Klasy COM** | ~1054 |
| **ProgID zarejestrowane** | 801 w `HKCR` |

---

## Spis treści

1. [Architektura COM Optimy](#1-architektura-com-optimy)
2. [Licencjonowanie: HASP vs Subscription](#2-licencjonowanie-hasp-vs-subscription)
3. [Metody logowania — pełna lista](#3-metody-logowania--pełna-lista)
4. [Sesje COM — prawidłowe tworzenie](#4-sesje-com--prawidłowe-tworzenie)
5. [Hierarchia interfejsów](#5-hierarchia-interfejsów)
6. [Kolekcje i wzorce dostępu](#6-kolekcje-i-wzorce-dostępu)
7. [Katalog encji COM](#7-katalog-encji-com)
8. [Serwisy biznesowe](#8-serwisy-biznesowe)
9. [Moduły, KSeF, eSklep, SplitPay, PPK](#9-moduły-ksef-esklep-splitpay-ppk)
10. [IParametryOperatora — 442 uprawnienia](#10-iparametryoperatora--442-uprawnienia)
11. [IStempel — audyt operacji](#11-istempel--audyt-operacji)
12. [Błędy COM — mapowanie HResult → HTTP](#12-błędy-com--mapowanie-hresult--http)
13. [CDN_Konfiguracja — baza konfiguracyjna](#13-cdn_konfiguracja--baza-konfiguracyjna)
14. [IFirm — organizacje, backup, restore](#14-ifirm--organizacje-backup-restore)
15. [Wymagania deploymentowe](#15-wymagania-deploymentowe)

---

## 1. Architektura COM Optimy

### 1.1 Warstwy DLL

```
Fundament (Core)
├── ICDNBase.dll     — IApplication, ILogin, IFirm, IDatabase, ISession, kolekcje
├── ICDNLib.dll      — Biblioteka narzędziowa, okresy
├── ICDNConst.dll    — Słowniki systemowe, stałe (kraje, ZUS, NIP, schematy)
├── ICDNKONFIGLib.dll— Konfiguracja systemowa (CfgKey, CfgValue)
└── ICDNBaseW.dll    — Kreatory, wizardy firm

Dane wspólne / konfiguracja
├── ICDNHeal.dll     — Kontrahenci (533), Operatorzy (710), Waluty, Terminy, Banki
├── ICDNHeal2.dll    — Sync, stawki, kurierzy, detale stanowisk, JD pola, Sendit
└── ICDNOSAY.dll     — Opisy analityczne, wymiary

Handel i Magazyn
├── ICDNHlmn.dll     — Dokumenty handlowe (1076!), Elementy (572), Magazyny, Dostawy
├── ICDNTwrb1.dll    — Towary (565), Ceny, Rabaty, Atrybuty, Receptury, Dane binarne
└── IOP_Twrb2Lib.dll — eSklep, braki, producenci, marki

Kasa / Bank
└── IOP_KASBOLib.dll — Zdarzenia KB (326), Płatności (312), Zapisy KB (303), Kompensaty

Księgowość
├── ICDNKH.dll       — Dekret (220), Konta, Rozrachunki, Bilans
├── ICDNDave.dll     — Dzienniki, Okresy, Zestawienia, e-Sprawozdania, Projekty
├── ICDNKPRR.dll     — KPiR, Ryczałt, Remanent
├── ICDNSchematy.dll — Schematy księgowe, Budżety, Wyliczenia
├── ICDNRVAT.dll     — VAT (548), Delegacje, Ewidencje
└── ICDNR2R.dll      — Rozrachunki R2R

Kadry i Płace
├── ICDNPrac.dll     — Pracownicy (228), Historia (541), Umowy, Etaty
├── ICDNWypb.dll     — Wypłaty (564), Listy płac (177), Składniki (316)
├── ICDNSlow.dll     — Słowniki kadrowe (rodzina, wykształcenie, ZUS, PIT)
├── ICDNPlcfg.dll    — Konfiguracja płac (typy składników, zbiory, algorytmy)
├── IOP_KALBLib.dll  — Czas pracy, nieobecności (178), kalendarze (134)
└── IOP_KALB2Lib.dll — RCP, atrybuty, limity

Majątek
└── ICDNSrtb.dll     — Środki trwałe (471), Amortyzacja, Wyposażenie, Samochody

CRM i Serwis
├── IOP_CCRMLib.dll  — Kontakty CRM (330), Windykacja, Faktury cykliczne, Ankiety
├── IOP_CSRSLib.dll  — Zlecenia serwisowe (340), Części, Czynności
└── IOP_SEKLib.dll   — Obieg dokumentów (128), Etapy, Schematy, Katalogi

Integracje / Import / Eksport
├── ICDNMail.dll     — Wiadomości email (211), SMS
├── ICDNDeklaracje.dll— Deklaracje podatkowe, ZUS, KEDU
├── IOP_DBIMPLib.dll — Import/Export Excel, offline, banki, urzędy
├── IOP_IMPEXPLib.dll— Praca rozproszona
├── IZIPMODLib.dll   — ZIP
└── ICDNResPr.dll    — Resource provider
```

### 1.2 Rejestracja COM

```
801 ProgID w HKCR\:
CDN.Banki  CDN.DaneBinarne  CDN.Dekrety  CDN.DokNag  CDN.DokumentyHaMag
CDN.DokumentyKK  CDN.Dzienniki  CDN.FormyPlatnosci  CDN.Kalendarze
CDN.Kategorie  CDN.Konta  CDN.Kontakty  CDN.Kontrahenci  CDN.Magazyny
CDN.Marki  CDN.Nieobecnosci  CDN.Notowania  CDN.Okresy  CDN.Operatorzy
CDN.Producenci  CDN.Pracownicy  CDN.Rabaty  CDN.Rachunki  CDN.RejestryVAT
CDN.Schematy  CDN.SrodkiTrwale  CDN.SrsZlecenia  CDN.Sync  CDN.Towary
CDN.TwrGrupy  CDN.Urzedy  CDN.Waluty  CDN.ZapisyKPR  CDN.BazModulyOperatora
```

### 1.3 ProgID NIEZAREJESTROWANE (użyteczne, niedostępne przez CreateObject)

```
CDN.KntDodatkowe   — dostępne tylko jako sub-kolekcja IKontrahent.Dodatkowe
CDN.StanyMagazynowe— tylko odczyt SQL
```

---

## 2. Licencjonowanie: HASP vs Subscription

### 2.1 DWA modele — KOMPLETNIE RÓŻNE API

| Cecha | HASP Legacy | Subscription |
|-------|-------------|-------------|
| Moduły | 18 (KP..CRMP) | 15 (PODSTAWOWY..DODATKOWY_ST) |
| Sub-moduły | brak | 27 (PODSTAWOWYFA..HRPROPKP) |
| Metoda logowania | `Login()` / `LoginOpe()` / `Login2Firm()` | `LoginSubscription()` / `LoginOpeSubscription()` / `Login2FirmSubscription()` |
| Wykrywanie | `HASPKeyNumber > 0` | `IsSubscriptionKeyType() == 1` |
| Parametry operatora | 18 flag `Modul*` | 18 flag HASP + 27 flag subscription |

### 2.2 Moduły HASP (18)

```
KP, KH, KHP, ST, FA, MAG, PK, PKXL, CRM, ANL, DET, BIU, SRW, OBD, KB, KBP, HAP, CRMP
```

### 2.3 Moduły Subscription (15)

```
PODSTAWOWY, FINANSEBASIC, FINANSEPRO, LOGISTYKABASIC, LOGISTYKAPRO,
RETAILBASIC, RETAILPRO, HRBASIC, HRPRO,
DODATKOWY_FA, DODATKOWY_CRM, DODATKOWY_KH, DODATKOWY_OBD, DODATKOWY_OW, DODATKOWY_ST
```

### 2.4 Sub-moduły Subscription (27)

```
PODSTAWOWYFA, PODSTAWOWYKP, PODSTAWOWYPK,
FINANSEBASICFA, FINANSEBASICKP,
FINANSEPROKHP, FINANSEPROST,
LOGISTYKAPROHAP, LOGISTYKAPROSRW,
RETAILPROHAP, RETAILPROSRW,
HRPROPKP
```

### 2.5 Automatyczne wykrywanie typu licencji

```csharp
// Krok 1: Sprawdź czy to subscription
int isSubscription = app.IsSubscriptionKeyType("", false, "", "LOGIN", "FIRMA");
// Zwraca 1 = Subscription, 0 = HASP

// Krok 2: Alternatywnie
int hasSubPilot = app.HASPKeyHasSubPilotAttribute();

// Krok 3: Pobierz aktualne moduły jako Recordset
Recordset rs = app.CurrentModulesState("", false, "", "LOGIN", "FIRMA");

// Krok 4: Pobierz dostępne numery kluczy
Recordset keys = app.AvailableKeyNumbers("KEY_MANAGER_SERVER");
```

### 2.6 Błędy w sygnaturach COM (do zapamiętania)

- `LoginSubscription`: parametr `_ModuDODATKOWY_FA` (brak "l" w Modul)
- `LoginSubscription`: parametr `_ModulKDODATKOWY_KH` ("K" zamiast "l")

---

## 3. Metody logowania — pełna lista

### 3.1 HASP Legacy (18 modułów)

```csharp
// 1. Login — user + hasło + firma + moduły
ILogin Login(
    object vUser, object vChk, object vFirm,
    object _ModulKP, object _ModulKH, object _ModulKHP, object _ModulST,
    object _ModulFA, object _ModulMAG, object _ModulPK, object _ModulPKXL,
    object _ModulCRM, object _ModulANL, object _ModulDET, object _ModulBIU,
    object _ModulSRW, object _ModulOBD, object _ModulKB, object _ModulKBP,
    object _ModulHAP, object _ModulCRMP
);

// 2. LoginOpe — user + hasło + moduły (bez firmy)
ILogin LoginOpe(
    object vUser, object vChk,
    object _ModulKP, object _ModulKH, object _ModulKHP, object _ModulST,
    object _ModulFA, object _ModulMAG, object _ModulPK, object _ModulPKXL,
    object _ModulCRM, object _ModulANL, object _ModulDET, object _ModulBIU,
    object _ModulSRW, object _ModulOBD, object _ModulKB, object _ModulKBP,
    object _ModulHAP, object _ModulCRMP
);

// 3. Login2Firm — firma + moduły (po LoginOpe)
ILogin Login2Firm(
    object vFirm,
    object _ModulKP, object _ModulKH, ...18 total...
);

// 4. LoginDomain — konto domenowe + firma
ILogin LoginDomain(
    object vFirm, object logInFirm,
    object _ModulKP, object _ModulKH, ...18 total...
);
```

### 3.2 Subscription (15 modułów)

```csharp
// 5. LoginSubscription
ILogin LoginSubscription(
    object vUser, object vChk, object vFirm,
    object _ModulPODSTAWOWY, object _ModulFINANSEBASIC, object _ModulFINANSEPRO,
    object _ModulLOGISTYKABASIC, object _ModulLOGISTYKAPRO,
    object _ModulRETAILBASIC, object _ModulRETAILPRO,
    object _ModulHRBASIC, object _ModulHRPRO,
    object _ModuDODATKOWY_FA, object _ModulDODATKOWY_CRM,
    object _ModulKDODATKOWY_KH, object _ModulDODATKOWY_OBD,
    object _ModulDODATKOWY_OW, object _ModulDODATKOWY_ST
);

// 6. LoginOpeSubscription
ILogin LoginOpeSubscription(object vUser, object vChk, ...15 modułów...);

// 7. Login2FirmSubscription
ILogin Login2FirmSubscription(object vFirm, ...15 modułów...);

// 8. LoginDomainSubscription
ILogin LoginDomainSubscription(object vFirm, object logInFirm, ...15 modułów...);
```

### 3.3 Specjalne

```csharp
// 9. LockApp — zablokowanie aplikacji na czas operacji
ILogin LockApp(int iFlags, int iTimeout, object vLogin, object vUser, object vChk, object vFirm);

// 10. GetOperatorCodeByDomainAccount — pobranie kodu operatora z AD
string GetOperatorCodeByDomainAccount();
```

### 3.4 Poprawna kolejność logowania

```csharp
// KROK 1: Utwórz aplikację
Type appType = Type.GetTypeFromProgID("CDNBase.Application");
dynamic app = Activator.CreateInstance(appType);

// KROK 2: Wykryj typ licencji
int isSubscription = app.IsSubscriptionKeyType("", false, "", "OPERATOR", "FIRMA");

// KROK 3: Zaloguj operatora
dynamic login;
if (isSubscription == 1)
    login = app.LoginOpeSubscription("user", "password", moduly...15);
else
    login = app.LoginOpe("user", "password", moduly...18);

// KROK 4: Zaloguj do firmy
if (isSubscription == 1)
    app.Login2FirmSubscription("FIRMA", moduly...15);
else
    app.Login2Firm("FIRMA", moduly...18);

// KROK 5: UTWÓRZ SESJĘ PRAWIDŁOWO (patrz §4)
// ❌ NIE: Activator.CreateInstance(AdoSessionType)
// ✅ TAK: login.CreateSession()
```

---

## 4. Sesje COM — prawidłowe tworzenie

### 4.1 BŁĄD w większości implementacji

```csharp
// ❌ BŁĘDNIE — tworzy GOŁĄ sesję bez kontekstu operatora, firmy i modułów!
var sessionType = Type.GetTypeFromProgID("CDNBase.AdoSession");
var session = (AdoSession)Activator.CreateInstance(sessionType);
```

### 4.2 POPRAWNIE — sesja z kontekstem

```csharp
// ✅ POPRAWNIE — sesja odziedzicza kontekst z ILogin
dynamic login = app.LoginOpe("user", "pwd", moduly...);
AdoSession session = login.CreateSession();
// Teraz session.Login, session.Connection, session.Variables są wypełnione
```

### 4.3 Hierarchia sesji

```
ISession (bazowy)
├── Changed, Path, Session
├── CreateObject(), Save(), Resync(), NewRef(), RemoveObject()
│
└── IAdoSession (rozszerzony) : ISession + IInitializeSession + ISaveable + IStateable + IVerifiable
    ├── Variables, Connection, ConfigConnection
    ├── Login : ILogin           ← KLUCZOWE: dostęp do loginu
    ├── ActiveTransaction
    ├── OpenTransaction()        ← transakcje COM!
    ├── CreateObjectEx()         ← tworzenie z ścieżką
    ├── WillAction / ActionCompleted / ActionFailed / Progress — eventy
    ├── SaveState() / RestoreState() — checkpointy
    ├── SetOption()
    └── Dispose() / ClearState()
```

### 4.4 Cykl życia sesji

```csharp
// 1. Tworzenie
AdoSession session = login.CreateSession();

// 2. Praca z obiektami
dynamic col = session.CreateObject("CDN.Kontrahenci", null);
dynamic ent = col.AddNew(null);
ent.Akronim = "NOWY";
ent.Nazwa1 = "Nowy Kontrahent";
ent.Verify();  // walidacja biznesowa

// 3. Zapis
session.Save();  // zapisuje wszystkie zmodyfikowane obiekty w sesji

// 4. Transakcje (opcjonalnie)
ITransactionOpt tran = session.OpenTransaction();
try {
    // operacje...
    tran.SetComplete();
} catch {
    tran.SetAbort();
}

// 5. Sprzątanie
session.ClearState();
Marshal.ReleaseComObject(session);

// 6. Wylogowanie
login.LoginOut();
Marshal.ReleaseComObject(login);
app.LoginOut();
Marshal.ReleaseComObject(app);
```

---

## 5. Hierarchia interfejsów

### 5.1 IApplication (119 members) — brama do Optimy

```csharp
// Licencje
int HASPKeyNumber, HASPKeyState, HASPUserName, HASPDBCount, HASPDBNumber
string HASPKeyNumberEx, HASPKeyServer, HASPErrorDesc
KeyManagerConnectionStatus HASPConnectionStatus
IPeriod HASPKeySubscriptionPeriod
string KSeFKeyNumber

// Konfiguracja
IDatabase Configuration     // dostęp do CDN_Konfiguracja
Dictionary Variables
string Version, UILanguage
double AppToday, OptimaAppToday
int API                    // czy API jest włączone?

// Firmy
IFirm RegisterFirm(string name, object replace)
void UnregisterFirm(object firm)
int Count                  // liczba firm
IFirm Item                 // indekser firm

// Bezpieczeństwo
string SHA1(string password)
string CodeBase(...)
string MakeBase()
void VerifyBase(...)
void ValidateKey()
```

### 5.2 ILogin (38 members) — kontekst zalogowanego operatora

```csharp
// Kontekst
IFirm Firm                    // firma
int OperatorID                // ID operatora
int StanowiskoID              // ID stanowiska
IParametryOperatora OperatorParam  // 442 uprawnienia!
int Moduly                    // bitmapa modułów (do odczytu)

// Metody
AdoSession CreateSession()           // POPRAWNE tworzenie sesji
Object CreateObject(string className) // tworzenie obiektu przez login
Connection GetConnection(bool config)
void PushBackConnection(Connection cn, bool config)
void ClearState()
double DateToday()
void SetContextInfo(Connection cn)
AdoSession CreateSessionInDatabase(object firm)
Recordset GetDataSizesCompany()

// Monitoring
int DBSizeLimitExceeded, SQLServerVersion, TablesSize, TablesSizeLimitExceeded
int RejestrujOperacjeOperatora
```

### 5.3 IFirm (69 members) — firma / baza danych

```csharp
// Metadane
Guid GUID                          // ← OrganizationId! Mapowanie do ControlPlane
string Name, Server, Database
string Comment, OrgDostep, SerwerMK
int ID, Active
double Version
FirmStateEnum State
string LastBackupName

// Połączenie
Connection Connection
string User, Password
int Trusted_Connection

// Zarządzanie bazą
void Create(), Remove()
void Backup(string file, int verify, string comment)
void Restore(string file, int replace)
void RenameDatabase(string newName)
void Convert(), ReIndex()
void DestroyConnection()
void ExecuteFromFile(string sqlFile)
void ChangeSAPassword(string old, string new, Connection cn)
void UpdateNameServers(string configServer, string firmServer, Connection cn)
Recordset GetCacheRecordset(string sql, Connection cn)
void FlushCacheRecordset(string sql)

// Administracja
void UpdateDatabase()
void DisconnectDatabase(string dbName, string configServer, string configBase)
void VerifySystemCDN()
void InstallUpdates()
void CreateSqlViews()
void ResetCredentials()
void UpdateContextInfo()
```

### 5.4 IDatabase (44 members) — baza konfiguracyjna / dowolna firma

```csharp
// To samo co IFirm, plus:
void BackupEx(string file, int verify, string comment, int compression, int copyOnly)
void TestConnection(int toDB, ref int result, ref string error)
int IsLocalSQL()
int SQLServiceStatus()
void SQLStartService()
int SQLType()
void CheckSqlVersion()
void ExecuteFromString(string sql)
```

### 5.5 IConfiguration (51 members) — konfiguracja systemowa

```csharp
// To samo co IDatabase, plus:
void AddAdminIfNone(int firmId, string code, string name)
void RestoreStdPrintouts()
void RestoreStdAnalyses()
void CreateKRST2016(int withUpdate)
void ResetCredentials()
void SaveHASPCredential(string server, string value)
string ReadHASPCredential(string server)
```

---

## 6. Kolekcje i wzorce dostępu

### 6.1 Hierarchia kolekcji

```
ICollection (12 members)                ← bazowa
├── Item, Count, Session
├── GetEnumerator(), AddNew(clone), Delete(where), Resync(where)
│
├── IClientCollection (74 members)      ← klient (bogatszy)
│   ├── Recordset, Bookmark, Filter, SQL
│   ├── ItemClass, FieldID, UniqueTable
│   ├── ConfigDatabase, EventUpdate
│   ├── FieldDateFrom/To, Cached, ForceNotCached
│   ├── UpdateFK(), CloneFromRecordset()
│   └── DeleteSoft()
│
├── IServerCollection (60 members)      ← serwer (cięższy)
│   ├── TableName, OrderBy, EventDelete
│   ├── FieldOOTIType/SubType/Name/Description
│   └── State, ROSaveMode
│
├── IConstCollection (34 members)       ← stałe słownikowe
│   ├── ProviderClass, CacheLevel, Matrix
│   └── LoadResource(module, type, number)
│
├── ILinkCollection (33 members)        ← tabele łącznikowe
│   ├── MasterCollection, SQL
│   └── FieldID
│
└── IDictionaryCollection (13 members)  ← słowniki
    └── Init(Dictionary, enableDelete, itemClass)
```

### 6.2 Wzorzec pracy z kolekcją

```csharp
// 1. Pobranie kolekcji przez sesję
dynamic col = session.CreateObject("CDN.Kontrahenci", null);

// 2. Filtrowanie (indekser SQL)
dynamic ent = col["Knt_Kod='TEST'"];          // pojedynczy
dynamic ent2 = col[123];                       // po ID

// 3. Dodawanie
dynamic newEnt = col.AddNew(null);             // clone=null
newEnt.Akronim = "ABC";
newEnt.Nazwa1 = "Firma ABC";

// 4. Walidacja
newEnt.Verify();                               // rzuca COMException przy błędzie

// 5. Zapis całej sesji
session.Save();

// 6. Usuwanie
col.Delete("Knt_KntId=456");
session.Save();

// 7. Enumeracja (ITERUJE CAŁĄ KOLEKCJĘ — wolne dla dużych zbiorów!)
foreach (dynamic entity in col) { /* ... */ }

// 8. Alternatywnie — Recordset (szybciej)
Recordset rs = col.Recordset;
while (!rs.EOF) {
    string name = rs.Fields["Knt_Nazwa1"].Value;
    rs.MoveNext();
}
```

### 6.3 Wzorzec CreateObject — indekser klas COM

```csharp
// Pełna nazwa klasy: "CDN.{Nazwa}"
dynamic contractors = session.CreateObject("CDN.Kontrahenci", null);
dynamic items = session.CreateObject("CDN.Towary", null);
dynamic invoices = session.CreateObject("CDN.DokumentyHaMag", null);

// Filtr przy tworzeniu (gdy nie null — tworzy kolekcję z filtrem)
dynamic filtered = session.CreateObject("CDN.Towary", "Twr_Kod='ABC'");

// CreateObjectEx — z ścieżką i klonem
dynamic obj = session.CreateObjectEx("CDN.Towary", "path", "clone_source");
```

---

## 7. Katalog encji COM

### 7.1 Encje z zarejestrowanym ProgID — pełna lista

| Encja | ProgID | DLL | Interfejs | Members | Filtr ID |
|-------|--------|-----|-----------|---------|----------|
| Bank | `CDN.Banki` | IOP_KASBOLib | `IBank` | 150 | `Bnk_BnkId` |
| BazModulyOperatora | `CDN.BazModulyOperatora` | ICDNHeal2 | `IBazModulyOperatora` | 152 | `BMO_Id` |
| DanaBinarna | `CDN.DaneBinarne` | ICDNTwrb1 | `IDanaBinarna` | 79 | `DaB_DaBId` |
| Dekret | `CDN.Dekrety` | ICDNKH | `IDekret` | 220 | `Dek_DekId` |
| DokumentHaMag | `CDN.DokumentyHaMag` | ICDNHlmn | `IDokumentHaMag` | **1076** | `TrN_TrNId` |
| DokumentKK | `CDN.DokumentyKK` | IOP_KASBOLib | `IDokumentKK` | 148 | `Dok_DokId` |
| Dziennik | `CDN.Dzienniki` | ICDNDave | `IDziennik` | 30 | `Dzi_DziId` |
| FormaPlatnosci | `CDN.FormyPlatnosci` | IOP_KASBOLib | `IFormaPlatnosci` | 68 | `FPl_FPlId` |
| Kalendarz | `CDN.Kalendarze` | IOP_KALBLib | `IKalendarzObj` | 134 | `Kal_KalId` |
| Kategoria | `CDN.Kategorie` | ICDNHeal | `IKategoria` | 119 | `Kat_KatId` |
| Kontakt (CRM) | `CDN.Kontakty` | IOP_CCRMLib | `IKontakt` | 330 | `KnK_KnKId` |
| Konto | `CDN.Konta` | ICDNKH | `IKonto` | 122 | `Knt_KntId` |
| Kontrahent | `CDN.Kontrahenci` | ICDNHeal | `IKontrahent` | 533 | `Knt_KntId` |
| Magazyn | `CDN.Magazyny` | ICDNHlmn | `IMagazyn` | 51 | `Mag_MagId` |
| Marka | `CDN.Marki` | IOP_Twrb2Lib | `IMarka` | 27 | `Mar_MarId` |
| Nieobecnosc | `CDN.Nieobecnosci` | IOP_KALBLib | `INieobecnosc` | 178 | `Nie_NieId` |
| Notowanie | `CDN.Notowania` | ICDNHeal | `INotowanie` | 42 | `WNo_WNoId` |
| Okres | `CDN.Okresy` | ICDNDave | `IOkres` | 68 | `Okr_OkrId` |
| Operator | `CDN.Operatorzy` | ICDNHeal | `IOperator` | **710** | `Ope_OpeId` |
| Pracownik | `CDN.Pracownicy` | ICDNPrac | `IPracownik` | 228 | `Prc_PrcId` |
| Producent | `CDN.Producenci` | IOP_Twrb2Lib | `IProducent` | 29 | `Prd_PrdId` |
| Rabat | `CDN.Rabaty` | ICDNTwrb1 | `IRabat` | 61 | `Rab_RabId` |
| Rachunek | `CDN.Rachunki` | IOP_KASBOLib | `IRachunek` | 150 | `Rac_RacId` |
| RejestrVAT | `CDN.RejestryVAT` | ICDNRVAT | `IVAT` | 548 | `ReV_ReVId` |
| Schemat | `CDN.Schematy` | ICDNSchematy | `ISchemat` | 97 | `Sch_SchId` |
| SrodekTrwaly | `CDN.SrodkiTrwale` | ICDNSrtb | `ISrodekTrwaly` | 471 | `StT_StTId` |
| SrsZlecenie | `CDN.SrsZlecenia` | IOP_CSRSLib | `ISrsZlecenie` | 340 | `SrZ_SrZId` |
| Sync | `CDN.Sync` | ICDNHeal2 | `ISync` | 132 | — |
| Towar | `CDN.Towary` | ICDNTwrb1 | `ITowar` | 565 | `Twr_TwrId` |
| TwrGrupa | `CDN.TwrGrupy` | ICDNTwrb1 | `ITwrGrupa` | 58 | `TwG_TwGId` |
| Urzad | `CDN.Urzedy` | ICDNHeal | `IUrzad` | 109 | `Urz_UrzId` |
| Waluta | `CDN.Waluty` | ICDNHeal | `IWaluta` | 49 | `WNa_WNaID` |
| ZapisyKPR | `CDN.ZapisyKPR` | ICDNKPRR | `IZapisKPR` | 154 | `ZkP_ZkPId` |
| DokNag (SEK) | `CDN.DokNag` | IOP_SEKLib | `IDokNag` | 128 | `DoN_DoNId` |

### 7.2 Sub-kolekcje (dostęp przez rodzica)

| Rodzic | Sub-kolekcja | Interfejs | Opis |
|--------|-------------|-----------|------|
| IKontrahent | `.Dodatkowe` | KntDodatkowe | Dodatkowe dane kontrahenta |
| IKontrahent | `.Osoby` | KntOsoby | Osoby kontaktowe (tabela `CDN.KntOsoby`) |
| IKontrahent | `.Adresy` | Adresy | Adresy kontrahenta |
| IDokumentHaMag | `.Elementy` | IElementHaMag (572) | Pozycje dokumentu handlowego |
| IDokumentHaMag | `.Platnosci` | Platnosci | Płatności dokumentu |
| IDekret | `.Elementy` | IDekretElement (169) | Linie Wn/Ma dekretu |
| IPracownik | `.Historia` | IHistoria (541) | Historia pracownika |
| IPracownik | `.Umowy` | IUmowa (195) | Umowy pracownika |
| IPracownik | `.Etaty` | IEtat (135) | Etaty pracownika |
| ISrodekTrwaly | `.ZapisyHist` | ISrodekTrwalyZapisHist (33) | Historia środka trwałego |
| ISrsZlecenie | `.Czesci` | ISrsCzesc (245) | Części serwisowe |
| ISrsZlecenie | `.Czynnosci` | ISrsCzynnosc (209) | Czynności serwisowe |

### 7.3 Encje tylko przez SQL (bez ProgID COM)

| Encja | Tabela SQL | Uwagi |
|-------|-----------|-------|
| Stany magazynowe | `CDN.TwrZasoby` | Brak ProgID, tylko SQL |
| KntDodatkowe | `CDN.KntDodatkowe` | ProgID niezarejestrowany, dostęp przez IKontrahent.Dodatkowe |
| Osoby kontaktowe | `CDN.KntOsoby` | ProgID `CDN.Kontakty` = IKontakt (CRM), NIE to samo co KntOsoby! |
| Definicje cen | `CDN.DefCeny` | Dostęp tylko przez COM manager |

---

## 8. Serwisy biznesowe

### 8.1 Pełna lista serwisów

| Serwis | DLL | Members | Opis | Kluczowe metody |
|--------|-----|---------|------|-----------------|
| **ISerwisKsiegowy** | ICDNKH | 34 | Księgowanie dokumentów | `KsiegujDokument()`, `Przeksiegowanie()`, `Dekretacja()`, `AnulujKsiegowanie()` |
| **ISerwisDekretow** | ICDNKH | 10 | Operacje na dekretach | `Kopiuj()`, `Odwroc()`, `Skoryguj()` |
| **IRozrachunkiManager** | ICDNKH | 110 | Rozrachunki | `Rozlicz()`, `Odroluj()`, `Kompensata()`, `NotaOdsetkowa()` |
| **ISerwisHaMag** | ICDNHlmn | 21 | Dokumenty handlowe | `Przelicz()`, `AktualizujCeny()`, `GenerujFaktureZaliczkowa()` |
| **ISerwisKPR** | ICDNKPRR | 23 | KPiR | `ZamknijOkres()`, `OtworzOkres()`, `GenerujZaliczke()` |
| **ISerwisAmortyzacji** | ICDNSrtb | 20 | Amortyzacja | `NaliczAmortyzacje()`, `ZamknijOkres()` |
| **IGeneratorAmortyzacji** | ICDNSrtb | 52 | Generator amortyzacji | `GenerujAmortyzacje()`, `GenerujAmortyzacjeDlaSrodka()` |
| **ISerwisWizardow** | ICDNSchematy | 69 | Wizardy księgowe | `WykonajWizard()` |
| **ISerwisWyliczen** | ICDNSchematy | 72 | Wyliczenia schematów | `WykonajWyliczenia()`, `TestujSchemat()` |
| **ISerwisDeklaracji** | ICDNDeklaracje | 52 | Deklaracje podatkowe | `GenerujDeklaracje()`, `WyslijDeklaracje()`, `Podpisz()` |
| **ISerwisCzasuPracy** | IOP_KALBLib | 8 | Czas pracy | `GenerujCzasPracy()`, `ZamknijOkres()` |
| **ICSCollector** | IOP_KALBLib | 69 | Kolektor czasu pracy | `DodajDzien()`, `UsunDzien()`, `Importuj()` |
| **ISerwisLimitow** | IOP_KALB2Lib | 14 | Limity nieobecności | `SprawdzLimit()`, `AktualizujLimit()` |
| **ISerwisAtrybutow** | IOP_KALB2Lib | 7 | Atrybuty RCP | `DodajAtrybut()`, `UsunAtrybut()` |

### 8.2 Księgowanie dokumentu — pełna sygnatura

```csharp
// ISerwisKsiegowy.KsiegujDokument
void KsiegujDokument(
    object dokument,       // IDokumentHaMag — dokument źródłowy
    object dziennik,       // IDziennik — dziennik docelowy
    object schemat,        // ISchemat — schemat księgowy
    object dataKsiegowania,// DateTime
    object opis,           // string
    object generujRozniceKursowe, // int (0/1)
    object okres,          // IOkres (null = bieżący)
    object projekt         // IProjekt (null = brak)
);
```

---

## 9. Moduły, KSeF, eSklep, SplitPay, PPK

### 9.1 KSeF — Krajowy System e-Faktur

```csharp
// IApplication
string KSeFKeyNumber          // numer klucza KSeF

// IParametryOperatora — uprawnienia KSeF
int WysylanieFakturDoKSeF                       // 0/1
int AutomatyczneWysylanieFakturDoKSeF            // 0/1
int UwierzytelnienieZaPomocaToken                // 0/1
int KSeF_PrawoDoOdbieraniaeFaktur               // 0/1
int KSeF_PrawoDoOdbieraniaeFakturZakupu         // 0/1
int KSeF_PrawoDoOdbieraniaeFakturSprzedazy      // 0/1

// IOperator — certyfikat KSeF
object KSeFCertificate             // certyfikat
string KSeFCertificateThumbprint   // odcisk palca certyfikatu
DateTime KSeFCertificateValidTo    // data ważności
int KSeFAuthenticationMethod       // metoda autoryzacji
```

### 9.2 eSklep — integracja ze sklepem internetowym

```csharp
// ITowar
ITwrESklep eSklep { get; }          // obiekt e-sklep (84 members)
// IeSklepStanowisko (213 members)  — stanowisko e-sklep

// IDokumentHaMag — pola eSklep
string TrN_TrNTransportNumer        // numer transportu
string TrN_TrNTransportOpis         // opis transportu
int TrN_TrNTransportStatus          // status transportu
```

### 9.3 Split Payment (MPP)

```csharp
// IDokumentHaMag
int TrN_MPP         // Mechanizm Podzielonej Płatności (0/1)
// Możliwe wartości: 0=OFF, 1=ON

// VAT — IVAT
int MPP              // split payment dla rejestru VAT
```

### 9.4 PPK — Pracownicze Plany Kapitałowe

```csharp
// IWyplata
void GenerujPodatekPPK()            // generowanie podatku PPK
void GenerujSkladkiPPK()            // generowanie składek PPK

// IPracownik — PPK
// sub-kolekcje PKZP (osiem kolekcji!)
```

### 9.5 Opłata cukrowa

```csharp
// IDokumentHaMag
decimal TrN_OplataCukrowa           // opłata cukrowa
// IElementHaMag
decimal TrE_OplataCukrowa           // opłata cukrowa na pozycji
```

---

## 10. IParametryOperatora — 442 uprawnienia

### 10.1 Kategorie uprawnień

| Kategoria | Liczba | Przykłady |
|-----------|--------|-----------|
| Moduły HASP | 18 | `ModulKP`, `ModulKH`, `ModulFA`, `ModulMAG`, `ModulDET`... |
| Moduły Subscription | 27 | `ModulPODSTAWOWY`, `ModulFINANSEBASICFA`... |
| KSeF | 5 | `WysylanieFakturDoKSeF`, `KSeF_PrawoDoOdbieraniaeFaktur`... |
| CRM | 5 | `CRM_DostepDoZadanInnychOperatorowRO`, `PrawoOdblokowaniaKontaktu`... |
| Blokady | 21 | `BlokadaZmianCenFA`, `BlokadaAnulowaniaHaMag`, `BlokadaPlac`... |
| Bufory domyślne | 9 | `BuforVATSpr`, `BuforVATZak`, `BuforKasa`, `BuforOkres`... |
| SSO/Token | 3 | `SSOLogin`, `SSOToken`, `UwierzytelnienieZaPomocaToken` |
| Administracyjne | 5 | `Administrator`, `Kierownik`, `PelneMenu`, `KopiaBezpieczenstwa` |
| Kontrola dostępu | 30+ | `DostepDoKontInnychOperatorow`, `DostepDoSkrzynkiInnychOperatorow`... |

### 10.2 Dostęp do parametrów

```csharp
// Przez ILogin
IParametryOperatora param = login.OperatorParam;

// Przez IOperator
dynamic op = col["Ope_Kod='ADMIN'"];
int admin = op.Administrator;
int modulKP = op.ModulKP;
string ksefCert = op.KSeFCertificateThumbprint;

// Zapis (wymaga IParametryOperatora z odpowiednimi prawami)
param.ModulKP = 1;
param.BuforVATSpr = 1;
session.Save();
```

### 10.3 Kluczowe flagi administracyjne

```csharp
int Administrator         // 1 = admin (ma uprawnienia do wszystkiego)
int PelneMenu              // 1 = pełne menu (widzi wszystkie opcje)
int KopiaBezpieczenstwa   // 1 = może robić backup
int Kierownik              // 1 = kierownik (dodatkowe uprawnienia)
i