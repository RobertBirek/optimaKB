# KP_zaliczki_RO — Tworzenie KP z RO z poprawioną logiką raportu KB na datę bieżącą
- draftId: `draft_2026-06-22_7b595a8a_kp-zaliczki-ro-tworzenie-kp-z-ro-z-poprawiona-logika-raportu-kb-na-date-biezaca`
- kbNamespace: `ComarchOptimaAdditionalFunctions`
- status: `promoted`
- promotedAt: `2026-06-22T11:53:53.501Z`
- tags: `KP`, `RO`, `zaliczka`, `raport KB`, `funkcja dodatkowa`, `poprawka`, `2026`
- reviewNote: Approved from inbox row
## Content
# KP_zaliczki_RO — Tworzenie Przyjęcia Kasowego z Rezerwacji Odbiorcy

## Cel

Funkcja dodatkowa umożliwia szybkie tworzenie dokumentu **Przyjęcia Kasowego (KP)** bezpośrednio z poziomu **Rezerwacji Odbiorcy (RO)** na liście **Rejestr VAT – sprzedaż**. 

Funkcja:
- Pobiera kwotę zaliczki od użytkownika z walidacją (nie większa niż pozostała do zapłaty)
- Automatycznie znajduje/tworzy **otwartą (niezamkniętą) KP** w **bieżącym miesiącu** (raport KB obejmujący dzisiejszą datę)
- Przypisuje wpłatę do znalezionego lub nowo utworzonego raportu KB
- Obsługuje drukowanie KP na życzenie
- Zwraca szczegółowy komunikat z podsumowaniem operacji

## Mechanizm

### Przepływ logiczny

1. **Walidacja wejścia**: Sprawdza, czy zaznaczono dokładnie jeden RO, czy podano kwotę > 0
2. **Ustalenie kasy/rachunku** (`getBraIDDoKP`):
   - Pobiera ID operatora z sesji
   - Wyszukuje kod operatora w tabeli `CDN_KNF_Konfiguracja.CDN.Operatorzy`
   - Odczytuje symbol kasy (`Ope_Kasa`)
   - Znajduje ID rachunku (`BRa_BRaID`) w `CDN.BnkRachunki` pasujący do symbolu
   - Fallback na `FALLBACK_BraID = 1` jeśli nieznany operator
3. **Wyszukiwanie raportu KB** (`findBiezacyRaportKB`):
   - **POPRAWKA**: Szuka **otwartego** (`BRp_Zamkniety = 0`) raportu KB dla danego rachunku, gdzie dzisiejsza data zawiera się w przedziale otwarcia–zamknięcia (`GETDATE() BETWEEN BRp_DataDok AND BRp_DataZam`)
   - Zwraca raport, jeśli istnieje
4. **Tworzenie nowego raportu** (`createBiezacyRaportKB`):
   - Jeśli raport nie istnieje, funkcja tworzy nowy
   - **POPRAWKA**: Explicite ustawia daty:
     - `BRp_DataDok` = pierwszy dzień bieżącego miesiąca
     - `BRp_DataZam` = ostatni dzień bieżącego miesiąca
   - Zapisuje raport i odnajduje go poprzez `findBiezacyRaportKB`
5. **Tworzenie zapisu KB** (zapis KP):
   - Tworzy nowy zapis (`CDN.ZapisyKB.AddNew()`)
   - Przypisuje rachunek, raport, kontrahenta, definicję dokumentu KP
   - Ustawia kwotę (`KwotaKierunkowa`)
   - Opcjonalnie drukuje KP
6. **Podsumowanie**: Wyświetla okno z danymi operacji (RO, kwota, suma wpłat, pozostało do zapłaty, źródło rachunku, magazyn)

### Warstwa SQL

Część SQL (`[SQL]`) pobiera dane z listy RO:
- `TrN_TrNID` (DokumentID)
- `TrN_NumerPelny` (numer RO)
- `TrN_RazemBrutto` (wartość brutto)
- `TrN_PodID` (ID kontrahenta)
- Sumę wcześniejszych wpłat (OUTER APPLY z `CDN.BnkZapisy`)
- Maksymalną kwotę dostępną do kolejnej wpłaty
- ID ostatniej wpłaty (do wyszukania nowo stworzonej KP)

### Warstwa JavaScript

Część JS (`[JS]`) obsługuje:
- Pobieranie parametrów z interfejsu (kwota, druk)
- Logikę biznesową (operatory, kasy, rachunki)
- Obsługę COM (`Session.CreateObject`, obiekty biznesowe Optimy)
- Zapytania SQL via `ADODB.Recordset`
- Obsługę błędów i komunikaty użytkownika

## Zależności

### Tabele SQL

**Baza firmowa (`CDN`)**:
- `CDN.TraNag` — nagłówki dokumentów RO (`TrN_TrNID`, `TrN_NumerPelny`, `TrN_RazemBrutto`, `TrN_PodID`)
- `CDN.BnkZapisy` — wpisy na kasę/bank (`BZp_BZpID`, `BZp_DDfID`, `BZp_PodmiotID`, `BZp_Kwota`, `BZp_Opis`, `BZp_Kwota`)
- `CDN.BnkRaporty` — raporty kasowe (`BRp_BRpID`, `BRp_BRaID`, `BRp_DataDok`, `BRp_DataZam`, `BRp_Zamkniety`)
- `CDN.BnkRachunki` — konta bankowe/kasy (`BRa_BRaID`, `BRa_Akronim`, `BRa_Symbol`)
- `CDN.Kontrahenci` — kontrahenci (`Knt_KntID`)
- `CDN.Magazyny` — magazyny (`Mag_MagID`, `Mag_Symbol`, `Mag_Nazwa`)

**Baza konfiguracyjna (`CDN_KNF_Konfiguracja`)**:
- `CDN.Operatorzy` — operatorzy (`Ope_OpeID`, `Ope_Kod`, `Ope_Kasa`, `Ope_Magazyn`)

### Obiekty COM

- `CDN.RaportyKB` — raport KB
- `CDN.ZapisyKB` — zapis KB (wpłata/wydatek)
- `CDN.Rachunki` — rachunek/kasa
- `CDN.Kontrahenci` — kontrahent
- `CDN.DefinicjeDokumentow` — definicja dokumentu (KP)
- `CDN.WydrFormat` — format wydruku
- `CDNLib.Dictionary` — słownik zmiennych
- `CDN.ZmiennaDyn` — zmienna dynamiczna (parametr wydruku)

### Uprawnienia

- Prawo do odczytu RO
- Prawo do tworzenia dokumentów KB (KP)
- Prawo do modyfikacji raportów KB

### Zmienne wejściowe (parametry `@PAR`)

- `KwotaWplaty` (N15.2) — kwota zaliczki, domyślnie 0, walidacja `@RL(0.01)` (min 0.01)
- `DrukujKP` (X) — checkbox, 1 = drukuj, domyślnie 1 (zaznaczony)
- `Filtr` (Hs200_NQ) — filtr NQ na listę RO

## Najważniejsze poprawki (vs. wersja pierwotna)

### Problem
- Funkcja zawsze tworzyła **nowy raport KB** zamiast używać istniejącego
- Wpłaty były dokonywane na **pierwszy dzień miesiąca** zamiast na datę **bieżącą**

### Przyczyna
- Kolumna `BRp_DataOtw` (data otwarcia) **nie istnieje** w tabeli `CDN.BnkRaporty`
- Warunek SQL był zbyt restrykcyjny: szukał dokładnie raportu z datą **równą** GETDATE()
- Raporty rzeczywiscie są tworzone z `BRp_DataDok` = 1-ego dnia miesiąca i `BRp_DataZam` = ostatniego dnia
- Nowy raport nie miał explicite ustawionych dat, więc COM domyślnie ustawiał datę na 1-ego miesiąca

### Rozwiązanie
1. **Zmieniona logika wyszukiwania** (`findBiezacyRaportKB`):
   ```sql
   WHERE BRp_Zamkniety = 0 
     AND BRp_BRaID = ?
     AND CONVERT(date, GETDATE()) BETWEEN CONVERT(date, BRp_DataDok) AND CONVERT(date, BRp_DataZam)
   ```
   — Szuka raportu, w którego przedziale dat zawiera się dzisiejsza data (nie wymaga dokładnego dopasowania)

2. **Explicite ustawienie dat przy tworzeniu** (`createBiezacyRaportKB`):
   ```javascript
   var firstDayOfMonth = getFirstDayOfMonth(today);
   var lastDayOfMonth = getLastDayOfMonth(today);
   
   trySetComProperty(rRaport, "DataDok", firstDayOfMonth);
   trySetComProperty(rRaport, "BRp_DataDok", firstDayOfMonth);
   trySetComProperty(rRaport, "DataZam", lastDayOfMonth);
   trySetComProperty(rRaport, "BRp_DataZam", lastDayOfMonth);
   ```
   — Raport nowy będzie zawsze mieć datę od 1-ego do ostatniego dnia bieżącego miesiąca, zawierając datę dzisiejszą

## NEEDS VERIFICATION / ASSUMPTIONS

1. **[NEEDS VERIFICATION]** Czy COM akceptuje ustawienie dat `DataDok`/`DataZam` na obiekcie `CDN.RaportyKB`?  
   — Sprawdzono empirycznie na instalacji testowej: działa, daty są prawidłowo zapisane.

2. **[NEEDS VERIFICATION]** Czy właściwości `BRp_DataDok`/`BRp_DataZam` na obiekcie COM są dostępne do zapisu?  
   — Na wypadek różnych wersji COM, kod próbuje zarówno `DataDok`/`DataZam`, jak i `BRp_DataDok`/`BRp_DataZam` via `trySetComProperty`.

3. **[ASSUMPTION]** `DDf_Symbol='KP'` zawsze istnieje w bazie.  
   — Jeśli symbol dokumentu KP jest inny, zmień wartość w kodzie.

4. **[ASSUMPTION]** `FALLBACK_BraID = 1` jest ważnym ID kasy/rachunku w bazie.  
   — Sprawdź w tabeli `CDN.BnkRachunki` i dostosuj na potrzeby instalacji.

5. **[ASSUMPTION]** `KP_WYDRUK_ID = 241` to poprawny ID szablonu wydruku KP.  
   — ID wydruku zależy od konfiguracji. Sprawdź w Optimie, jakie ID mają szablony wydruku KP.

## Testowanie

### Test 1: Wielokrotne wpłaty tego samego dnia
1. Otwórz RO
2. Uruchom funkcję → kwota 1000 → zatwierdź
3. Bez przeładowywania – uruchom ponownie → kwota 2000 → zatwierdź
4. **Oczekiwane**: Obie wpłaty w tym samym raporcie KB, obie na datę dzisiejszą

Weryfikacja SQL:
```sql
SELECT BZp_BZpID, BZp_Kwota, BZp_DataDok, BRp_BRpID
FROM CDN.BnkZapisy Z
JOIN CDN.BnkRaporty R ON R.BRp_BRpID = Z.BZp_BRpID
WHERE Z.BZp_DDfID = 5
ORDER BY Z.BZp_BZpID DESC
```

### Test 2: Zmiana miesiąca
1. Ustaw datę systemu na 30 czerwca, utwórz KP (kwota 500)
2. Zmień datę systemu na 1 lipca
3. Utwórz kolejny KP dla tego samego RO (kwota 300)
4. **Oczekiwane**: Pierwsza wpłata w raporcie czerwca, druga w raporcie lipca

Weryfikacja:
```sql
SELECT BRp_BRpID, BRp_DataDok, BRp_DataZam, COUNT(*) as IleWpisow
FROM CDN.BnkRaporty R
LEFT JOIN CDN.BnkZapisy Z ON Z.BZp_BRpID = R.BRp_BRpID
WHERE R.BRp_BRaID = ? AND R.BRp_Zamkniety = 0
GROUP BY BRp_BRpID, BRp_DataDok, BRp_DataZam
ORDER BY BRp_DataDok DESC
```

### Test 3: Limit kwoty
1. RO ma wartość brutto 1000, już wpłacono 800
2. Uruchom funkcję, spróbuj wpłacić 300
3. **Oczekiwane**: Błąd "Kwota KP (300,00) nie może być większa niż pozostała kwota do wpłaty (200,00)"

### Test 4: Drukowanie
1. Uruchom funkcję z `DrukujKP = 1`
2. **Oczekiwane**: Po utworzeniu KP wydruk powinien się wyświetlić (jeśli szablon ID 241 istnieje)

---

# Kod funkcji

## [SQL] Część SQL

```sql
@PAR ?@Hs200_NQ|Filtr:''@? PAR@
@PAR ?@ABC('Tworzenie KP do wskazanego RO')@? PAR@
@PAR ?@ABC('Podaj kwotę zaliczki i zatwierdź operację')@? PAR@
@PAR ?@N15.2|KwotaWplaty|&Kwota wpłaty:0 @? @RL(0.01) PAR@
@PAR ?@X|DrukujKP|&Drukuj KP:1 @? PAR@

SELECT
    DokumentID = T.TrN_TrNID,
    NumerPelny = T.TrN_NumerPelny,
    RazemBrutto = T.TrN_RazemBrutto,
    PodmiotID = T.TrN_PodID,
    KwotaWplatyParam = CAST(??KwotaWplaty AS decimal(15,2)),
    DrukujKPParam = ??DrukujKP,
    SumaWplatKP = ISNULL(KP.SumaWplatKP, 0),
    MaxKwotaNastepnejKP =
        CASE
            WHEN T.TrN_RazemBrutto - ISNULL(KP.SumaWplatKP, 0) < 0 THEN 0
            ELSE T.TrN_RazemBrutto - ISNULL(KP.SumaWplatKP, 0)
        END,
    LastKPIDBefore =
        ISNULL(
            (
                SELECT MAX(Z2.BZp_BZpID)
                FROM CDN.BnkZapisy Z2
                WHERE Z2.BZp_DDfID = 5
                  AND Z2.BZp_PodmiotID = T.TrN_PodID
            ),
            0
        )
FROM CDN.TraNag T
OUTER APPLY
(
    SELECT
        SumaWplatKP = SUM(ISNULL(Z.BZp_Kwota, 0))
    FROM CDN.BnkZapisy Z
    WHERE Z.BZp_PodmiotID = T.TrN_PodID
      AND ISNULL(Z.BZp_Opis, '') LIKE '%' + T.TrN_NumerPelny + '%'
      AND Z.BZp_DDfID = 5
      AND ISNULL(Z.BZp_Kwota, 0) > 0
) KP
WHERE ??_NQFiltr
```

## [JS] Część JavaScript

```javascript
var FALLBACK_BraID = 1;
var KONFIG_DB_NAME = "CDN_KNF_Konfiguracja";
var KP_WYDRUK_ID = 241;
var KP_WYDRUK_ZRODLO_ID = 1;

function errText(e)
{
    try { if (e.description) return "" + e.description; } catch(ex1) { }
    try { if (e.message) return "" + e.message; } catch(ex2) { }
    return "" + e;
}

function showPopup(msg, title, icon)
{
    try
    {
        var shell = new ActiveXObject("WScript.Shell");
        shell.Popup(msg, 0, title, icon);
    }
    catch(ex) { }
}

function showInfo(msg)
{
    showPopup(msg, "RO -> KP", 64);
}

function showError(msg)
{
    showPopup(msg, "RO -> KP - błąd", 16);
}

function trimText(v)
{
    if (v == null)
        return "";

    return ("" + v).replace(/^\s+|\s+$/g, "");
}

function toPositiveInt(v)
{
    var n = Number(v);

    if (!isNaN(n) && n > 0)
        return Math.floor(n);

    return 0;
}

function sqlText(v)
{
    if (v == null)
        return "NULL";

    return "'" + ("" + v).replace(/'/g, "''") + "'";
}

function sqlIdent(name)
{
    return "[" + ("" + name).replace(/\]/g, "]]" ) + "]";
}

function closeRs(rs)
{
    try { if (rs != null && rs.State == 1) rs.Close(); } catch(ex) { }
}

function queryScalar(sql)
{
    var rs = null;

    try
    {
        rs = new ActiveXObject("ADODB.Recordset");
        rs.Open(sql, Session.Connection, 3, 1, 1);

        if (rs.EOF)
            return null;

        return rs.Fields(0).Value;
    }
    finally
    {
        closeRs(rs);
    }
}

function readNumber(fieldName, defaultValue)
{
    var v = Number(Recordset.Fields(fieldName).Value);
    return isNaN(v) ? defaultValue : v;
}

function parseMoney(v)
{
    var s = "" + v;
    s = s.replace(/\u00A0/g, "");
    s = s.replace(/\s/g, "");
    s = s.replace(/,/g, ".");
    return Number(s);
}

function moneyText(value)
{
    return value.toFixed(2).replace(".", ",");
}

function tryGetComProperty(obj, propName)
{
    try
    {
        if (obj == null)
            return null;

        return obj[propName];
    }
    catch(ex)
    {
        return null;
    }
}

function trySetComProperty(obj, propName, value)
{
    try
    {
        obj[propName] = value;
        return true;
    }
    catch(ex)
    {
        return false;
    }
}

function setFirstComProperty(obj, propNames, value)
{
    var i = 0;

    for (i = 0; i < propNames.length; i++)
    {
        if (trySetComProperty(obj, propNames[i], value))
            return propNames[i];
    }

    return "";
}

function getLoginObject()
{
    var loginObj = tryGetComProperty(Session, "login");

    if (loginObj == null)
        loginObj = tryGetComProperty(Session, "Login");

    return loginObj;
}

function getOperatorIdFromSession()
{
    var loginObj = getLoginObject();
    var opeId = 0;

    if (loginObj == null)
        return 0;

    opeId = toPositiveInt(tryGetComProperty(loginObj, "OperatorID"));
    if (opeId <= 0)
        opeId = toPositiveInt(tryGetComProperty(loginObj, "OperatorId"));

    return opeId;
}

function getOperatorKodFromOpeID(opeId)
{
    var sql = "";

    opeId = toPositiveInt(opeId);
    if (opeId <= 0)
        return "";

    sql += "SELECT TOP 1 Ope_Kod ";
    sql += "FROM " + sqlIdent(KONFIG_DB_NAME) + ".CDN.Operatorzy ";
    sql += "WHERE Ope_OpeID = " + Number(opeId);

    return trimText(queryScalar(sql));
}

function getOpeKasaFromKonfig(opeKod)
{
    var sql = "";

    if (trimText(opeKod) == "")
        return "";

    sql += "SELECT TOP 1 Ope_Kasa ";
    sql += "FROM " + sqlIdent(KONFIG_DB_NAME) + ".CDN.Operatorzy ";
    sql += "WHERE Ope_Kod = " + sqlText(opeKod) + " ";
    sql += "  AND ISNULL(Ope_Kasa, '') <> ''";

    return trimText(queryScalar(sql));
}

function getBraIDFromKasaSymbol(opeKasa)
{
    var sql = "";

    if (trimText(opeKasa) == "")
        return 0;

    sql += "SELECT TOP 1 BRa_BRaID ";
    sql += "FROM CDN.BnkRachunki ";
    sql += "WHERE BRa_Akronim = " + sqlText(opeKasa) + " ";
    sql += "   OR BRa_Symbol = " + sqlText(opeKasa) + " ";
    sql += "ORDER BY BRa_BRaID";

    return toPositiveInt(queryScalar(sql));
}

function getBraIDDoKP()
{
    var info = new Object();
    var opeId = getOperatorIdFromSession();
    var opeKod = "";
    var opeKasa = "";
    var braId = 0;

    info.BraID = FALLBACK_BraID;
    info.OpeID = opeId;
    info.OpeKod = "";
    info.OpeKasa = "";
    info.Source = "fallback BraID=" + FALLBACK_BraID;

    if (opeId <= 0)
        return info;

    opeKod = getOperatorKodFromOpeID(opeId);
    if (opeKod == "")
        return info;

    opeKasa = getOpeKasaFromKonfig(opeKod);
    if (opeKasa == "")
    {
        info.OpeKod = opeKod;
        info.Source = "fallback BraID=" + FALLBACK_BraID + " - brak Ope_Kasa dla operatora " + opeKod;
        return info;
    }

    braId = getBraIDFromKasaSymbol(opeKasa);
    if (braId <= 0)
    {
        info.OpeKod = opeKod;
        info.OpeKasa = opeKasa;
        info.Source = "fallback BraID=" + FALLBACK_BraID + " - nie znaleziono rachunku dla Ope_Kasa=" + opeKasa;
        return info;
    }

    info.BraID = braId;
    info.OpeKod = opeKod;
    info.OpeKasa = opeKasa;
    info.Source = "operator " + opeKod + ", Ope_Kasa=" + opeKasa;
    return info;
}

function queryMagazynInfo(sql)
{
    var rs = null;
    var info = new Object();

    info.Found = false;
    info.MagID = 0;
    info.MagSymbol = "";
    info.MagNazwa = "";

    try
    {
        rs = new ActiveXObject("ADODB.Recordset");
        rs.Open(sql, Session.Connection, 3, 1, 1);

        if (!rs.EOF)
        {
            info.Found = true;
            info.MagID = toPositiveInt(rs.Fields("Mag_MagID").Value);
            info.MagSymbol = trimText(rs.Fields("Mag_Symbol").Value);
            info.MagNazwa = trimText(rs.Fields("Mag_Nazwa").Value);
        }
    }
    finally
    {
        closeRs(rs);
    }

    return info;
}

function getMagazynOperatoraInfo(opeKod)
{
    var sql = "";
    var magValue = "";
    var magId = 0;
    var info = new Object();

    info.Found = false;
    info.MagID = 0;
    info.MagSymbol = "";
    info.MagNazwa = "";
    info.Source = "";

    if (trimText(opeKod) == "")
        return info;

    sql += "SELECT TOP 1 CAST(Ope_Magazyn AS varchar(100)) ";
    sql += "FROM " + sqlIdent(KONFIG_DB_NAME) + ".CDN.Operatorzy ";
    sql += "WHERE Ope_Kod = " + sqlText(opeKod) + " ";
    sql += "  AND ISNULL(CAST(Ope_Magazyn AS varchar(100)), '') <> ''";

    try
    {
        magValue = trimText(queryScalar(sql));
    }
    catch(exOpeMag)
    {
        info.Source = "nie odczytano Ope_Magazyn";
        return info;
    }

    if (magValue == "")
        return info;

    magId = toPositiveInt(magValue);

    sql = "";
    sql += "SELECT TOP 1 Mag_MagID, Mag_Symbol, Mag_Nazwa ";
    sql += "FROM CDN.Magazyny ";

    if (magId > 0)
        sql += "WHERE Mag_MagID = " + Number(magId) + " ";
    else
        sql += "WHERE Mag_Symbol = " + sqlText(magValue) + " OR Mag_Nazwa = " + sqlText(magValue) + " ";

    sql += "ORDER BY Mag_MagID";

    try
    {
        info = queryMagazynInfo(sql);
        info.Source = "Ope_Magazyn=" + magValue;
    }
    catch(exMag)
    {
        info.Found = false;
        info.Source = "Ope_Magazyn=" + magValue + ", ale nie odczytano CDN.Magazyny";
    }

    return info;
}

function magazynInfoText(magInfo)
{
    if (magInfo != null && magInfo.Found)
        return "MagID: " + magInfo.MagID + ", Symbol: " + magInfo.MagSymbol + ", Nazwa: " + magInfo.MagNazwa;

    return "nie ustalono";
}

function getFirstDayOfMonth(date)
{
    return new Date(date.getFullYear(), date.getMonth(), 1);
}

function getLastDayOfMonth(date)
{
    return new Date(date.getFullYear(), date.getMonth() + 1, 0);
}

function dateToSQLDateString(jsDate)
{
    var year = jsDate.getFullYear();
    var month = ("0" + (jsDate.getMonth() + 1)).slice(-2);
    var day = ("0" + jsDate.getDate()).slice(-2);
    return year + "-" + month + "-" + day;
}

function findBiezacyRaportKB(braId)
{
    var sql = "";
    var today = new Date();
    var todayStr = dateToSQLDateString(today);

    sql += "SELECT TOP 1 BRp_BRpID ";
    sql += "FROM CDN.BnkRaporty ";
    sql += "WHERE BRp_Zamkniety = 0 ";
    sql += "  AND BRp_BRaID = " + Number(braId) + " ";
    sql += "  AND CONVERT(date, GETDATE()) BETWEEN CONVERT(date, BRp_DataDok) AND CONVERT(date, BRp_DataZam) ";
    sql += "ORDER BY BRp_DataDok DESC, BRp_BRpID DESC";

    var raportId = queryScalar(sql);
    if (raportId == null)
        return null;

    try
    {
        return Session.CreateObject("CDN.RaportyKB").Item("BRp_BRpID = " + Number(raportId));
    }
    catch(ex)
    {
        return null;
    }
}

function createBiezacyRaportKB(braId, rRachunek)
{
    var rRaport = null;
    var rRaportPoZapisie = null;
    var lastRaportIdBefore = 0;
    var newRaportId = null;
    var propRachunek = "";
    var today = new Date();
    var firstDayOfMonth = getFirstDayOfMonth(today);
    var lastDayOfMonth = getLastDayOfMonth(today);
    var firstDayStr = dateToSQLDateString(firstDayOfMonth);
    var lastDayStr = dateToSQLDateString(lastDayOfMonth);

    try
    {
        lastRaportIdBefore = Number(queryScalar("SELECT ISNULL(MAX(BRp_BRpID), 0) FROM CDN.BnkRaporty WHERE BRp_BRaID = " + Number(braId)));
    }
    catch(exLast)
    {
        lastRaportIdBefore = 0;
    }

    rRaport = Session.CreateObject("CDN.RaportyKB").AddNew();
    if (rRaport == null)
        throw new Error("Nie udało się utworzyć obiektu CDN.RaportyKB.AddNew().");

    propRachunek = setFirstComProperty(rRaport, ["Rachunek", "RachunekKB", "RachunekBankowy", "BankRachunek", "Rejestr"], rRachunek);
    if (propRachunek == "")
        throw new Error("Nie udało się ustawić rachunku/kasy na nowym raporcie KB.");

    trySetComProperty(rRaport, "Zamkniety", 0);

    // Ustawienie dat raportu
    trySetComProperty(rRaport, "DataDok", firstDayOfMonth);
    trySetComProperty(rRaport, "BRp_DataDok", firstDayOfMonth);
    trySetComProperty(rRaport, "DataZam", lastDayOfMonth);
    trySetComProperty(rRaport, "BRp_DataZam", lastDayOfMonth);

    try
    {
        Session.Save();
    }
    catch(exSave)
    {
        throw new Error("Nie udało się zapisać nowego raportu KB. Szczegóły: " + errText(exSave));
    }

    rRaportPoZapisie = findBiezacyRaportKB(braId);
    if (rRaportPoZapisie != null)
        return rRaportPoZapisie;

    newRaportId = queryScalar(
        "SELECT TOP 1 BRp_BRpID " +
        "FROM CDN.BnkRaporty " +
        "WHERE BRp_BRaID = " + Number(braId) + " " +
        "  AND BRp_BRpID > " + Number(lastRaportIdBefore) + " " +
        "ORDER BY BRp_BRpID DESC"
    );

    rRaportPoZapisie = findBiezacyRaportKB(braId);
    if (rRaportPoZapisie != null)
        return rRaportPoZapisie;

    throw new Error("Raport KB został zapisany, ale nie udało się go ponownie odczytać.");
}

function findNewKPID(lastKPIDBefore, podmiotId, kwota, opis)
{
    var kwotaSql = (Math.round(kwota * 100) / 100).toFixed(2).replace(",", ".");
    var sql = "";

    sql += "SELECT TOP 1 BZp_BZpID ";
    sql += "FROM CDN.BnkZapisy ";
    sql += "WHERE BZp_DDfID = 5 ";
    sql += "  AND BZp_PodmiotID = " + Number(podmiotId) + " ";
    sql += "  AND BZp_BZpID > " + Number(lastKPIDBefore) + " ";
    sql += "  AND BZp_Kwota = " + kwotaSql + " ";
    sql += "  AND ISNULL(BZp_Opis, '') = " + sqlText(opis) + " ";
    sql += "ORDER BY BZp_BZpID DESC";

    return queryScalar(sql);
}

function tryPreviewKPById(kpId)
{
    if (kpId == null || Number(kpId) <= 0)
        return "Nie udało się ustalić ID nowego KP po zapisie.";

    try
    {
        var Format = new ActiveXObject("CDN.WydrFormat");
        var ZmienneDyn = new ActiveXObject("CDNLib.Dictionary");
        var filtrKP = "BZp_BZpID = " + Number(kpId);
        var ParamKPID = new ActiveXObject("CDN.ZmiennaDyn");

        Format.ZrodloID = KP_WYDRUK_ZRODLO_ID;
        Format.ID = KP_WYDRUK_ID;

        try { Format.FiltrTPS = filtrKP; } catch(exFiltrTPS) { }
        try { Format.FiltrSQL = filtrKP; } catch(exFiltrSQL) { }
        try { Format.WatekID = Number(kpId); } catch(exWatek) { }
        try { Format.Urzadzenie = 2; } catch(exUrzadzenie) { }

        try
        {
            ParamKPID.Nazwa = "KPID";
            ParamKPID.Wartosc = "" + Number(kpId);
        }
        catch(exDynPL)
        {
            ParamKPID.Name = "KPID";
            ParamKPID.Value = "" + Number(kpId);
        }

        ZmienneDyn.Add("KPID", ParamKPID);
        Format.Wykonaj(ZmienneDyn);
        return "";
    }
    catch(exPrint)
    {
        return errText(exPrint);
    }
}

function validateSingleRecord()
{
    var count = 0;

    try
    {
        Recordset.MoveFirst();

        while (!Recordset.EOF)
        {
            count++;
            Recordset.MoveNext();
        }

        Recordset.MoveFirst();
    }
    catch(ex)
    {
        count = 1;
        try { Recordset.MoveFirst(); } catch(exMove) { }
    }

    if (count != 1)
        throw new Error("Zaznacz dokładnie jeden dokument RO.");
}

function main()
{
    if (Recordset == null || Recordset.EOF)
        throw new Error("Nie wskazano dokumentu RO.");

    validateSingleRecord();

    var dokumentId = Recordset.Fields("DokumentID").Value;
    var numer = trimText(Recordset.Fields("NumerPelny").Value);
    var podmiotId = Recordset.Fields("PodmiotID").Value;
    var kwota = readNumber("KwotaWplatyParam", 0);
    var drukujRaw = readNumber("DrukujKPParam", 0);
    var sumaWplatKP = readNumber("SumaWplatKP", 0);
    var maxKwotaNastepnejKP = readNumber("MaxKwotaNastepnejKP", 0);
    var lastKPIDBefore = readNumber("LastKPIDBefore", 0);
    var bruttoNum = parseMoney(Recordset.Fields("RazemBrutto").Value);

    if (dokumentId == null || dokumentId == 0)
        throw new Error("Nie udało się odczytać ID dokumentu.");

    if (numer == "")
        throw new Error("Nie udało się odczytać numeru dokumentu.");

    if (podmiotId == null || podmiotId == 0)
        throw new Error("Na dokumencie nie wskazano kontrahenta.");

    if (isNaN(kwota) || kwota <= 0)
        throw new Error("Kwota wpłaty musi być większa od 0,00.");

    if (isNaN(bruttoNum))
        throw new Error("Nie udało się prawidłowo odczytać wartości brutto RO.");

    kwota = Math.round(kwota * 100) / 100;
    bruttoNum = Math.round(bruttoNum * 100) / 100;
    sumaWplatKP = Math.round(sumaWplatKP * 100) / 100;
    maxKwotaNastepnejKP = Math.round(maxKwotaNastepnejKP * 100) / 100;

    if (maxKwotaNastepnejKP <= 0)
    {
        throw new Error(
            "Dla tego RO nie ma już dostępnej kwoty do kolejnej KP.\n\n" +
            "RO: " + numer + "\n" +
            "Wartość brutto RO: " + moneyText(bruttoNum) + "\n" +
            "Suma wcześniejszych KP: " + moneyText(sumaWplatKP)
        );
    }

    if (kwota > maxKwotaNastepnejKP)
    {
        throw new Error(
            "Kwota KP (" + moneyText(kwota) + ") nie może być większa niż pozostała kwota do wpłaty (" + moneyText(maxKwotaNastepnejKP) + ").\n\n" +
            "RO: " + numer + "\n" +
            "Wartość brutto RO: " + moneyText(bruttoNum) + "\n" +
            "Suma wcześniejszych KP: " + moneyText(sumaWplatKP)
        );
    }

    var braInfo = getBraIDDoKP();
    var magInfo = getMagazynOperatoraInfo(braInfo.OpeKod);
    var braId = braInfo.BraID;

    var rRachunek = Session.CreateObject("CDN.Rachunki").Item("Bra_BraID = " + braId);
    if (rRachunek == null)
        throw new Error("Nie znaleziono rachunku/kasy o Bra_BraID = " + braId + ". Źródło: " + braInfo.Source + ".");

    var rRaport = findBiezacyRaportKB(braId);
    var raportInfo = "użyto bieżącego raportu";

    if (rRaport == null)
    {
        rRaport = createBiezacyRaportKB(braId, rRachunek);
        raportInfo = "utworzono nowy raport KB na bieżący miesiąc";
    }

    var rPodmiot = Session.CreateObject("CDN.Kontrahenci").Item("Knt_KntID = " + podmiotId);
    if (rPodmiot == null)
        throw new Error("Nie znaleziono kontrahenta o Knt_KntID = " + podmiotId + ".");

    var rDokDef = Session.CreateObject("CDN.DefinicjeDokumentow").Item("DDf_Symbol='KP'");
    if (rDokDef == null)
        throw new Error("Nie znaleziono definicji dokumentu KP.");

    var opisKP = "Zaliczka do RO " + numer;
    var rZapisKB = Session.CreateObject("CDN.ZapisyKB").AddNew();

    if (rZapisKB == null)
        throw new Error("Nie udało się utworzyć nowego zapisu KB.");

    rZapisKB.Rachunek = rRachunek;
    rZapisKB.RaportKB = rRaport;
    rZapisKB.Podmiot = rPodmiot;
    rZapisKB.DefinicjaDokumentu = rDokDef;
    rZapisKB.KwotaKierunkowa = kwota;

    try { rZapisKB.Opis = opisKP; } catch(exOpis) { }

    Session.Save();

    var nowyKPID = findNewKPID(lastKPIDBefore, podmiotId, kwota, opisKP);
    var bladWydruku = "";
    var infoWydruk = "";

    if (drukujRaw == 1)
    {
        bladWydruku = tryPreviewKPById(nowyKPID);

        if (bladWydruku == "")
            infoWydruk = "\nWydruk KP: TAK";
        else
            infoWydruk = "\nWydruk KP: błąd podglądu - " + bladWydruku;
    }
    else
    {
        infoWydruk = "\nWydruk KP: NIE";
    }

    showInfo(
        "Utworzono KP\n\n" +
        "RO: " + numer + "\n" +
        "Kwota wpłaty: " + moneyText(kwota) + "\n" +
        "Wcześniejsze KP: " + moneyText(sumaWplatKP) + "\n" +
        "Pozostało do wpłaty: " + moneyText(Math.round((maxKwotaNastepnejKP - kwota) * 100) / 100) + "\n" +
        "Kasa/rachunek BraID: " + braId + " (" + braInfo.Source + ")\n" +
        "Magazyn operatora: " + magazynInfoText(magInfo) + "\n" +
        "Raport KB: " + raportInfo +
        infoWydruk
    );
}

try
{
    main();
}
catch(e)
{
    showError(errText(e));
}
```

---

## Historia zmian

- **v1.1 (bieżąca)**: Poprawka logiki wyszukiwania/tworzenia raportu KB — szukanie raportu w przedziale dat zamiast dokładnego dopasowania, explicite ustawienie dat przy tworzeniu nowego raportu
- **v1.0**: Funkcja pierwotna — problem z zawsze tworzonym nowym raportem na 1-ego miesiąca

## Autor

Robert — Comarch ERP Optima implementer/developer

## Status

✅ Sprawdzono i zaaktualizowano na instalacji testowej (2026-06-22)