# FS_NASTARCIE_FPL_OPERATOR_MAG_PROD v2.0 — automatyczne ustawienie formy płatności na FS wg magazynu operatora (Na starcie)
- draftId: `draft_2026-06-22_ff6c8d60_fs-nastarcie-fpl-operator-mag-prod-v2-0-automatyczne-ustawienie-formy-p-atnosci-`
- kbNamespace: `ComarchOptimaAdditionalFunctions`
- status: `promoted`
- promotedAt: `2026-06-22T07:19:02.654Z`
- tags: `FS`, `forma_platnosci`, `na_starcie`, `operator`, `magazyn`, `JS`, `SQL`, `funkcja_dodatkowa`, `znany_blad`
- reviewNote: Approved from inbox row
## Content
## Cel

Funkcja dodatkowa typu [SQL]+[JS], kontekst: **Formularz FS**, tryb automatyczny **Na starcie**.

Automatycznie ustawia formę płatności na nowo otwieranej Fakturze Sprzedaży na podstawie magazynu przypisanego do operatora (pole `Ope_Magazyn` w bazie konfiguracyjnej), zgodnie z mapowaniem magazyn → forma płatności zdefiniowanym wprost w kodzie (CTE `Mapowanie`).

## Zasady działania (z komentarza autora)

- działa tylko przy nowej FS (`DocId<=0` lub numer zawiera `/0/`),
- nie wywołuje `Save()`,
- nie wykonuje `UPDATE` na tabelach `CDN`,
- błędy loguje do pliku w `%TEMP%`, operator nie widzi komunikatów (działanie "silent").

## Architektura

**[SQL]**: jedno zapytanie łączące `CDN_KNF_Konfiguracja.CDN.Operatorzy` (baza konfiguracyjna, wskazana po pełnej trójczęściowej nazwie) z `CDN.Magazyny`, CTE mapowania magazyn→forma płatności, oraz `CDN.FormyPlatnosci` i `CDN.BnkRachunki` (baza firmowa). Wynik to jeden recordset z danymi dla **wszystkich** operatorów, status mapowania per operator (`StatusMapowania`: `OK` / `BRAK_MAGAZYNU_OPERATORA` / `BRAK_MAGAZYNU_W_FIRMIE` / `BRAK_MAPOWANIA_MAG_FPL` / `BRAK_FORMY_PLATNOSCI` / `FORMA_PLATNOSCI_NIEAKTYWNA`).

**[JS]**: ustala ID operatora bieżącej sesji (trzy próby ścieżki: `Session.login.OperatorID`, `Session.Login.OperatorID`, `Session.OperatorID`), wyszukuje jego wiersz w recordsecie, sprawdza status mapowania, porównuje bieżącą formę płatności dokumentu z docelową, i jeśli różna — pobiera obiekt formy przez `Session.CreateObject("CDN.FormyPlatnosci").Item("FPl_FPlID = " + fplId)` i przypisuje go do `CurrentObject.FormaPlatnosci`.

## Potwierdzone elementy (zweryfikowane empirycznie w instalacji, baza CDN_TEST / CDN_KNF_Konfiguracja)

- `CDN_KNF_Konfiguracja` — potwierdzona, rzeczywista nazwa bazy konfiguracyjnej w tej instalacji.
- `CDN.Operatorzy.Ope_Magazyn` (nvarchar) i `Ope_Kasa` (nvarchar) — istnieją w `CDN_KNF_Konfiguracja`, symbol magazynu/kasy operatora.
- `CDN.FormyPlatnosci` — kolumny: `FPl_FPlId`, `FPl_Nazwa`, `FPl_Typ` (smallint: `1`=gotówka/kasa, `2`=bank/przelew, `3`=online), `FPl_BRaId`, `FPl_Domyslna`, `FPl_NieAktywny`. **Nie istnieje** kolumna `FPl_Gotowka` — w tej i innych funkcjach należy odróżniać formy kasowe od bankowych przez `FPl_Typ`, nie przez nieistniejące pole.
- `CDN.TraNag.TrN_PodID` — potwierdzona nazwa kolumny ID kontrahenta na nagłówku dokumentu (nie `TrN_PodId_Pd`).
- `CDN.Kontrahenci.Knt_RachunekNr` — pole z numerem rachunku bankowego kontrahenta wprost w karcie kontrahenta (nie osobna tabela wielu rachunków w tej instalacji). `Knt_RachunekNr0` to wersja znormalizowana.

## Znany, nienaprawiony w tej wersji defekt

Mapowanie testowe: `MagId=1` → `FPlId=3` (przelew, `FPl_Typ=2`, `FPl_Domyslna=1` w tej bazie). Gdy funkcja ustawia formę "przelew" na dokumencie, a wybrany później przez operatora kontrahent **nie ma uzupełnionego `Knt_RachunekNr` w walucie dokumentu**, przy zapisie dokumentu Optima zwraca natywny komunikat **"Podmiot nie posiada domyślnego numeru rachunku"** (potwierdzone w oficjalnej bazie wiedzy Comarch: pomoc.comarch.pl, dokumentacja "Ogólne i Kasa/Bank" oraz "Dodanie nowego zapisu – zakładka Ogólne").

W bazie testowej CDN_TEST: 2 z 3 kontrahentów mają puste `Knt_RachunekNr`, co wyjaśnia częstotliwość występowania błędu również w kontekstach niezwiązanych z tą funkcją.

Funkcja w wersji 2.0 (poniżej) **nie zawiera żadnej walidacji rachunku kontrahenta** — ustawia formę płatności niezależnie od tego, czy docelowy kontrahent będzie w stanie ją obsłużyć. Poprawiona wersja (v2.1, z dodatkową walidacją `FPl_Typ`/`Knt_RachunekNr` oraz uzupełniającą funkcją w trybie "Przed zapisem") została opracowana w odrębnej konsultacji i powinna być zgłoszona jako osobny wpis KB.

## Pełny kod źródłowy (v2.0, oryginalny, bez poprawek)

```sql
[SQL]

/*
    FS_NASTARCIE_FPL_OPERATOR_MAG_PROD  v2.0
    -------------------------------------------------------
    Formularz FS | Tryb: Na starcie
    -------------------------------------------------------
    Cel:
      Automatyczne ustawienie formy platnosci na nowej FS
      na podstawie magazynu przypisanego do operatora.

    Zasady:
      - dziala tylko przy nowej FS (DocId=0 lub Numer=/0/),
      - nie wywoluje Save(),
      - nie wykonuje UPDATE na tabelach CDN,
      - bledy loguje do pliku, operator nie widzi komunikatow.

    Potwierdzone kolumny (z bazy):
      Ope_Magazyn nvarchar(40) — symbol magazynu operatora
      Ope_Kasa    nvarchar(40) — symbol kasy operatora

    Potwierdzone dane (z bazy):
      Mag_MagId=1, Mag_Symbol='MAGAZYN' -> FPl_FPlId=3 (przelew)
      Mag_MagId=2, Mag_Symbol='RB'      -> FPl_FPlId=9 (bank2)

    MAPOWANIE — dostosuj do produkcyjnych MagId i FPlId:
*/

;WITH Mapowanie AS
(
    SELECT CAST(1 AS INT) AS MagId, CAST(3 AS INT) AS FPlId
    UNION ALL
    SELECT CAST(2 AS INT) AS MagId, CAST(9 AS INT) AS FPlId
)
SELECT
    CAST(O.Ope_OpeID   AS INT)           AS OpeID,
    CAST(O.Ope_Kod     AS NVARCHAR(50))  AS OpeKod,
    CAST(O.Ope_Magazyn AS NVARCHAR(40))  AS OperatorMagSymbol,

    CAST(M.Mag_MagId   AS INT)           AS MagId,
    CAST(M.Mag_Symbol  AS NVARCHAR(20))  AS MagSymbol,
    CAST(M.Mag_Nazwa   AS NVARCHAR(50))  AS MagNazwa,

    CAST(MP.FPlId      AS INT)           AS DocelowaFPlId,
    CAST(F.FPl_Nazwa   AS NVARCHAR(20))  AS DocelowaFPlNazwa,
    CAST(F.FPl_BRaId   AS INT)           AS DocelowaBRaId,

    CAST(B.BRa_Nazwa      AS NVARCHAR(100)) AS DocelowyRachunekNazwa,
    CAST(B.BRa_RachunekNr AS NVARCHAR(102)) AS DocelowyRachunekNr,

    CAST(
        CASE
            WHEN LTRIM(RTRIM(ISNULL(O.Ope_Magazyn, N''))) = N''
                                         THEN N'BRAK_MAGAZYNU_OPERATORA'
            WHEN M.Mag_MagId  IS NULL    THEN N'BRAK_MAGAZYNU_W_FIRMIE'
            WHEN MP.FPlId     IS NULL    THEN N'BRAK_MAPOWANIA_MAG_FPL'
            WHEN F.FPl_FPlId  IS NULL    THEN N'BRAK_FORMY_PLATNOSCI'
            WHEN ISNULL(F.FPl_NieAktywny, 0) <> 0
                                         THEN N'FORMA_PLATNOSCI_NIEAKTYWNA'
            ELSE N'OK'
        END
    AS NVARCHAR(80)) AS StatusMapowania

FROM [CDN_KNF_Konfiguracja].[CDN].[Operatorzy] O

LEFT JOIN CDN.Magazyny M
    ON  M.Mag_Symbol = CAST(LTRIM(RTRIM(O.Ope_Magazyn)) AS VARCHAR(20))
        COLLATE DATABASE_DEFAULT

LEFT JOIN Mapowanie MP
    ON  MP.MagId = M.Mag_MagId

LEFT JOIN CDN.FormyPlatnosci F
    ON  F.FPl_FPlId = MP.FPlId

LEFT JOIN CDN.BnkRachunki B
    ON  B.BRa_BRaId = F.FPl_BRaId

ORDER BY O.Ope_Kod;


[JS]

var sh  = new ActiveXObject("WScript.Shell");
var fso = new ActiveXObject("Scripting.FileSystemObject");

var LOG_ENABLED   = true;
var LOG_PATH      = sh.ExpandEnvironmentStrings("%TEMP%")
                    + "\\Optima_FS_NaStarcie_FPl_OperatorMag_PROD.log";
var LOG_MAX_LINES = 2000;

function nowText() {
    var d = new Date();
    return d.getFullYear() + "-"
        + ("0" + (d.getMonth() + 1)).slice(-2) + "-"
        + ("0" + d.getDate()).slice(-2)         + " "
        + ("0" + d.getHours()).slice(-2)        + ":"
        + ("0" + d.getMinutes()).slice(-2)      + ":"
        + ("0" + d.getSeconds()).slice(-2);
}

function log(txt) {
    if (!LOG_ENABLED) return;
    try {
        if (fso.FileExists(LOG_PATH)) {
            var fc = fso.OpenTextFile(LOG_PATH, 1);
            var n  = 0;
            while (!fc.AtEndOfStream) { fc.ReadLine(); n++; }
            fc.Close();
            if (n > LOG_MAX_LINES) { fso.DeleteFile(LOG_PATH); }
        }
        var f = fso.OpenTextFile(LOG_PATH, 8, true);
        f.WriteLine(nowText() + " | " + txt);
        f.Close();
    } catch (e) { }
}

function safeStr(v) {
    try {
        if (v == null || typeof(v) == "undefined") return "";
        return "" + v;
    } catch(e) { return ""; }
}

function toIntOrNull(v) {
    try {
        if (v == null || typeof(v) == "undefined") return null;
        var n = parseInt("" + v, 10);
        return isNaN(n) ? null : n;
    } catch(e) { return null; }
}

function rsStr(name, def) {
    try {
        var v = Recordset.Fields(name).Value;
        return (v == null) ? def : "" + v;
    } catch(e) { return def; }
}

function rsInt(name, def) {
    var n = toIntOrNull(rsStr(name, null));
    return (n == null) ? def : n;
}

function objProp(obj, prop) {
    try {
        var v = obj[prop];
        return (v == null || typeof(v) == "undefined") ? "" : "" + v;
    } catch(e) { return ""; }
}

function nestedVal(obj, prop, sub) {
    try {
        if (obj == null) return null;
        var inner = obj[prop];
        if (inner == null || typeof(inner) == "undefined") return null;
        var v = inner[sub];
        return (typeof(v) == "undefined") ? null : v;
    } catch(e) { return null; }
}

function docFplId(doc)   { return toIntOrNull(nestedVal(doc, "FormaPlatnosci", "ID"));    }
function docFplName(doc) { return safeStr(nestedVal(doc, "FormaPlatnosci", "Nazwa")); }

function getOperatorId() {
    var paths = ["login", "Login"];
    for (var i = 0; i < paths.length; i++) {
        try {
            var n = toIntOrNull(Session[paths[i]].OperatorID);
            if (n != null && n > 0) return n;
        } catch(e) { }
    }
    try {
        var n2 = toIntOrNull(Session.OperatorID);
        if (n2 != null && n2 > 0) return n2;
    } catch(e) { }
    return null;
}

function isNewDoc(docId, numer) {
    if (docId == null || docId <= 0) return true;
    if (safeStr(numer).indexOf("/0/") >= 0) return true;
    return false;
}

function findOperatorData(operatorId) {
    try {
        if (typeof(Recordset) == "undefined" || Recordset == null) return null;
        try { if (Recordset.EOF && Recordset.BOF) return null; } catch(e) { }

        Recordset.MoveFirst();
        while (!Recordset.EOF) {
            if (rsInt("OpeID", 0) == operatorId) {
                return {
                    OpeID:              rsInt("OpeID", 0),
                    OpeKod:             rsStr("OpeKod", ""),
                    OperatorMagSymbol:  rsStr("OperatorMagSymbol", ""),
                    MagId:              rsInt("MagId", 0),
                    MagSymbol:          rsStr("MagSymbol", ""),
                    MagNazwa:           rsStr("MagNazwa", ""),
                    DocelowaFPlId:      rsInt("DocelowaFPlId", 0),
                    DocelowaFPlNazwa:   rsStr("DocelowaFPlNazwa", ""),
                    DocelowaBRaId:      rsInt("DocelowaBRaId", 0),
                    DocelowyRachunekNazwa: rsStr("DocelowyRachunekNazwa", ""),
                    DocelowyRachunekNr:    rsStr("DocelowyRachunekNr", ""),
                    StatusMapowania:    rsStr("StatusMapowania", "")
                };
            }
            Recordset.MoveNext();
        }
        return null;
    } catch(e) {
        log("BLAD findOperatorData | " + e.description);
        return null;
    }
}

function getFplObject(fplId) {
    try {
        var formy = Session.CreateObject("CDN.FormyPlatnosci");
        return formy.Item("FPl_FPlID = " + fplId);
    } catch(e) {
        log("BLAD getFplObject | FPlId=" + fplId + " | " + e.description);
        return null;
    }
}

function main() {
    try {
        if (typeof(Session)       == "undefined" || Session       == null) { log("POMIJAM | Brak Session");       return; }
        if (typeof(CurrentObject) == "undefined" || CurrentObject == null) { log("POMIJAM | Brak CurrentObject"); return; }

        var doc   = CurrentObject;
        var docId = toIntOrNull(objProp(doc, "ID"));
        var numer = objProp(doc, "NumerPelny");

        if (!isNewDoc(docId, numer)) {
            log("POMIJAM | Istniejacy dokument | DocId=" + docId + " | Numer=" + numer);
            return;
        }

        var operatorId = getOperatorId();
        if (operatorId == null || operatorId <= 0) {
            log("POMIJAM | Brak OperatorID | Numer=" + numer);
            return;
        }

        var d = findOperatorData(operatorId);
        if (d == null) {
            log("POMIJAM | Brak danych operatora w Recordset | OperatorID=" + operatorId + " | Numer=" + numer);
            return;
        }

        if (d.StatusMapowania != "OK") {
            log("POMIJAM | Status=" + d.StatusMapowania
                + " | OpeKod=" + d.OpeKod
                + " | MagSymbol=" + d.OperatorMagSymbol
                + " | Numer=" + numer);
            return;
        }

        if (d.DocelowaFPlId <= 0) {
            log("POMIJAM | DocelowaFPlId=0 | OpeKod=" + d.OpeKod + " | Numer=" + numer);
            return;
        }

        var przedId   = docFplId(doc);
        var przedNazwa = docFplName(doc);

        if (przedId == d.DocelowaFPlId) {
            log("OK | Forma juz zgodna"
                + " | OpeKod=" + d.OpeKod
                + " | Mag=" + d.MagSymbol
                + " | FPl=" + przedId + "-" + przedNazwa
                + " | Numer=" + numer);
            return;
        }

        var forma = getFplObject(d.DocelowaFPlId);
        if (forma == null) {
            log("POMIJAM | Nie pobrano obiektu formy platnosci"
                + " | FPlId=" + d.DocelowaFPlId
                + " | OpeKod=" + d.OpeKod
                + " | Numer=" + numer);
            return;
        }

        CurrentObject.FormaPlatnosci = forma;

        var poId   = docFplId(doc);
        var poNazwa = docFplName(doc);

        log("OK | Ustawiono forme platnosci"
            + " | OpeKod=" + d.OpeKod
            + " | Mag=" + d.MagSymbol
            + " | Przed=" + przedId   + "-" + przedNazwa
            + " | Cel="   + d.DocelowaFPlId + "-" + d.DocelowaFPlNazwa
            + " | Po="    + poId      + "-" + poNazwa
            + " | Numer=" + numer);

    } catch(e) {
        log("BLAD | " + e.description);
    }
}

main();
```
</content>