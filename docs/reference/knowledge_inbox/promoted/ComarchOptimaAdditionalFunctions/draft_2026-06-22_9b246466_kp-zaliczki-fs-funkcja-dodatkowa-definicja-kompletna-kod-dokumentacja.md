# KP -> zaliczki FS — funkcja dodatkowa (definicja kompletna, kod + dokumentacja)
- draftId: `draft_2026-06-22_9b246466_kp-zaliczki-fs-funkcja-dodatkowa-definicja-kompletna-kod-dokumentacja`
- kbNamespace: `ComarchOptimaAdditionalFunctions`
- status: `promoted`
- promotedAt: `2026-06-22T08:01:49.329Z`
- tags: `KP_zaliczki_FS`, `zweryfikowane`, `Zaliczki`, `TraNagRelacje`, `TraElemRelacje`, `OpeDaneOperatora`
- reviewNote: Approved and exported from dashboard
## Content
## Funkcja dodatkowa: KP -> zaliczki FS (dopisywanie KP jako zaliczek do faktury sprzedaży na podstawie powiązanego RO)

### Cel
Funkcja dodatkowa uruchamiana ręcznie (F11) z listy lub formularza faktury sprzedaży (FS). Wyszukuje zapisy kasowo-bankowe (KP, wpływy, PLN) powiązane z kontrahentem FS, których opis zawiera numer rezerwacji odbiorcy (RO) powiązanej z tą FS, i dopisuje je jako zaliczki do CDN.Zaliczki. Limit kwotowy = TrN_RazemBrutto FS minus już zaznaczone zaliczki.

### Mechanizm
SQL + JS, wykonywane przez ADO Connection pobrane z `Recordset.ActiveConnection` (połączenie bieżącej sesji Optimy). Tryb ręczny, kontekst: lista/formularz FS.

### Zależności i tabele
- `CDN.TraNag` — nagłówek FS i RO. `TrN_TrNID` jest unikalnym PK niezależnie od typu dokumentu (typ trzymany w `TrN_TypDokumentu`).
- `CDN.TraNagRelacje` — relacje na poziomie nagłówków dokumentów. Kolumny: `TrR_TrRId` (PK), `TrR_TrNTyp`, `TrR_TrNId`, `TrR_FaTyp`, `TrR_FaId`, `TrR_Flaga`. Relacja przechowywana symetrycznie (każda para A↔B ma dwa wiersze) — zweryfikowane na danych produkcyjnych klienta.
- `CDN.TraElemRelacje` — relacje na poziomie elementów. Kolumny: `TeR_TeRId` (PK), `TeR_ParentTyp`, `TeR_ParentId`, `TeR_ChildTyp`, `TeR_ChildId`, `TeR_Flaga`, `TeR_Info`, `TeR_Info2`. `ParentId`/`ChildId` wskazują na `CDN.TraElem.TrE_TrEID`, nie na nagłówek — wymagany dodatkowy JOIN do `TrE_TrNId`.
- `CDN.TraElem` — elementy dokumentów handlowych (`TrE_TrEID`, `TrE_TrNId`, `TrE_PodmiotTyp`, `TrE_PodID`).
- `CDN.BnkZapisy` — zapisy KP/KW. Pole walutowe `BZp_Waluta` (varchar(3)) dla PLN przechowywane jako `NULL`/`''`, nie jako `'PLN'`.
- `CDN.Zaliczki` — tabela zaliczek, relacja `FK_DoRBnkZapis` do `CDN.BnkZapisy` przez `Zal_BZpId`.
- `CDN.OpeDaneOperatora` — procedura systemowa `EXEC CDN.OpeDaneOperatora @OpeId INOUT int, @OpeKod INOUT varchar(20), @OpeNazwisko INOUT nvarchar(50), @Log INOUT int`, zwracająca dane operatora bieżącej sesji SQL (wzorzec potwierdzony w katalogu wyzwalaczy Optimy). Nie zwraca danych stacji.

### Logika
1. Pre-flight check (poza transakcją): sprawdzenie czy FS jest anulowana lub w buforze, z potwierdzeniem użytkownika dla bufora.
2. W transakcji: blokada wiersza FS (`WITH (UPDLOCK, HOLDLOCK)`), odczyt danych FS, walidacja anulowania.
3. Próba odczytu operatora bieżącej sesji przez `CDN.OpeDaneOperatora`; jeśli nieudana — flaga `AudytFallback=1` i użycie danych operatora z oryginalnego zapisu KP jako fallback.
4. Ustalenie numeru RO: ręcznie podany / przez relację nagłówków / przez relację elementów / wymagana jednoznaczność jeśli wykrywanie automatyczne.
5. Wyszukanie KP: PLN, kierunek wpływu, opis zawierający numer RO (escapowany dla wildcardów LIKE), nierozliczone w pełni, jeszcze nie powiązane z tą FS.
6. Naliczenie kwot zaliczek z poszanowaniem limitu (FSBrutto minus już zaznaczone zaliczki), insert do `CDN.Zaliczki` z atrybucją operatora.
7. Raport końcowy z listą dopisanych KP i ostrzeżeniem, jeśli zadziałał fallback audytu operatora.

### Pełny kod

```
[SQL]
SELECT 0 AS Dummy;

[JS]
try {

    var shell = new ActiveXObject("WScript.Shell");

    /* ============================================================
       KONFIGURACJA
       Zostaw 0 / "" w normalnej pracy.
       Ustaw ręcznie tylko do testu diagnostycznego.
    ============================================================ */
    var MANUAL_FS_TRNID  = 0;
    var MANUAL_RO_NUMER   = "";
    var RO_NUMER_PREFIX   = "RO/";   // [ASSUMPTION] prefiks numeracji RO w tej instalacji

    /* ============================================================
       POMOCNICZE
    ============================================================ */
    function asText(v) {
        if (v === null || v === undefined) return "";
        return String(v);
    }

    function asInt(v, def) {
        var n = parseInt(v, 10);
        return isNaN(n) ? def : n;
    }

    function sqlText(v) {
        return asText(v).replace(/'/g, "''");
    }

    function readCurrentTrNId() {
        var props = ["ID", "Id", "TrN_TrNID", "TrNID", "DokumentID"];
        for (var i = 0; i < props.length; i++) {
            try {
                var v = CurrentObject[props[i]];
                var n = parseInt(v, 10);
                if (!isNaN(n) && n > 0) return n;
            } catch (eRead) {}
        }
        return 0;
    }

    /* ============================================================
       USTALENIE ID BIEŻĄCEJ FS
    ============================================================ */
    var fsTrNID = MANUAL_FS_TRNID > 0 ? MANUAL_FS_TRNID : readCurrentTrNId();
    var roNumer = MANUAL_RO_NUMER;

    if (fsTrNID <= 0) {
        shell.Popup(
            "Nie udało się ustalić TrN_TrNID bieżącej FS.\n\n" +
            "Uruchom funkcję z listy faktur sprzedaży\n" +
            "albo ustaw MANUAL_FS_TRNID w kodzie.",
            0, "KP -> zaliczki FS", 16
        );
        throw new Error("Brak TrN_TrNID FS.");
    }

    /* ============================================================
       POŁĄCZENIE ADO
    ============================================================ */
    var cn = null;
    try {
        cn = Recordset.ActiveConnection;
    } catch (eCn) {
        cn = null;
    }

    if (cn === null) {
        shell.Popup(
            "Nie udało się pobrać połączenia ADO\n" +
            "z Recordset.ActiveConnection.",
            0, "KP -> zaliczki FS", 16
        );
        throw new Error("Brak połączenia ADO.");
    }

    /* ============================================================
       PRE-FLIGHT: sprawdzenie statusu FS przed główną transakcją
       Błąd pre-flight jest nieblokujący — główny SQL stanowi
       drugą linię obrony (THROW 51001 / 51002).
    ============================================================ */
    var rsChk = null;
    try {
        rsChk = cn.Execute(
            "SET NOCOUNT ON; " +
            "SELECT ISNULL(TrN_Anulowany, 0) AS Anulowany, " +
            "       ISNULL(TrN_Bufor, 0)     AS Bufor " +
            "FROM CDN.TraNag WHERE TrN_TrNID = " + fsTrNID + ";"
        );
    } catch (eChk) {
        rsChk = null;
    }

    if (rsChk !== null && !rsChk.EOF) {

        var preAnulowany = asInt(rsChk.Fields("Anulowany").Value, 0);
        var preBufor     = asInt(rsChk.Fields("Bufor").Value, 0);

        try { rsChk.Close(); } catch (eck) {}
        rsChk = null;

        if (preAnulowany !== 0) {
            shell.Popup(
                "Dokument FS jest anulowany.\n\nPrzerwano.",
                0, "KP -> zaliczki FS", 16
            );
            throw new Error("FS anulowana.");
        }

        if (preBufor !== 0) {
            var odp = shell.Popup(
                "Dokument FS jest w buforze.\n\n" +
                "Czy kontynuować?",
                0, "KP -> zaliczki FS", 36
            );
            if (odp !== 6) {
                throw new Error("Anulowano przez użytkownika (FS w buforze).");
            }
        }
    }

    /* ============================================================
       BUDOWANIE SQL
    ============================================================ */
    var q = [];

    q.push("SET NOCOUNT ON;");
    q.push("SET XACT_ABORT ON;");
    q.push("");

    q.push("IF OBJECT_ID('tempdb..#ROCandidates') IS NOT NULL");
    q.push("    DROP TABLE #ROCandidates;");
    q.push("");

    q.push("BEGIN TRY");
    q.push("    BEGIN TRAN;");
    q.push("");
    q.push("    DECLARE @FSTrNID    int          = " + fsTrNID + ";");
    q.push("    DECLARE @RONumer    nvarchar(80) = NULLIF(N'" + sqlText(roNumer) + "', N'');");
    q.push("    DECLARE @ROPrefix   nvarchar(20) = N'" + sqlText(RO_NUMER_PREFIX) + "';");
    q.push("");
    q.push("    DECLARE @PodmiotTyp   int;");
    q.push("    DECLARE @PodmiotID    int;");
    q.push("    DECLARE @FSNumerPelny nvarchar(80);");
    q.push("    DECLARE @FSBrutto     decimal(15,2);");
    q.push("    DECLARE @TrNAnulowany int;");
    q.push("    DECLARE @TrNBufor     int;");
    q.push("");
    q.push("    DECLARE @CurOpeId        int          = NULL;");
    q.push("    DECLARE @CurOpeKod       varchar(20)  = NULL;");
    q.push("    DECLARE @CurOpeNazwisko  nvarchar(50) = NULL;");
    q.push("    DECLARE @CurLog          int          = NULL;");
    q.push("    DECLARE @AudytFallback   bit          = 0;");
    q.push("");
    q.push("    EXEC CDN.OpeDaneOperatora");
    q.push("        @CurOpeId       OUT,");
    q.push("        @CurOpeKod      OUT,");
    q.push("        @CurOpeNazwisko OUT,");
    q.push("        @CurLog         OUT;");
    q.push("");
    q.push("    IF @CurOpeId IS NULL OR @CurOpeId <= 0");
    q.push("        SET @AudytFallback = 1;");
    q.push("");
    q.push("    SELECT");
    q.push("        @PodmiotTyp   = TrN_PodmiotTyp,");
    q.push("        @PodmiotID    = TrN_PodID,");
    q.push("        @FSNumerPelny = TrN_NumerPelny,");
    q.push("        @FSBrutto     = TrN_RazemBrutto,");
    q.push("        @TrNAnulowany = ISNULL(TrN_Anulowany, 0),");
    q.push("        @TrNBufor     = ISNULL(TrN_Bufor, 0)");
    q.push("    FROM CDN.TraNag WITH (UPDLOCK, HOLDLOCK)");
    q.push("    WHERE TrN_TrNID = @FSTrNID;");
    q.push("");
    q.push("    IF @PodmiotTyp IS NULL OR @PodmiotID IS NULL");
    q.push("        THROW 51001, 'Nie znaleziono FS dla podanego TrN_TrNID.', 1;");
    q.push("");
    q.push("    IF @TrNAnulowany <> 0");
    q.push("        THROW 51002, 'Dokument FS jest anulowany. Przerwano.', 1;");
    q.push("");
    q.push("    CREATE TABLE #ROCandidates");
    q.push("    (");
    q.push("        RONumer nvarchar(80)  NOT NULL,");
    q.push("        Zrodlo  nvarchar(200) NULL");
    q.push("    );");
    q.push("");
    q.push("    IF @RONumer IS NOT NULL");
    q.push("    BEGIN");
    q.push("        INSERT INTO #ROCandidates(RONumer, Zrodlo)");
    q.push("        VALUES (@RONumer, N'MANUAL_RO_NUMER');");
    q.push("    END");
    q.push("");
    q.push("    IF @RONumer IS NULL AND OBJECT_ID('CDN.TraNagRelacje') IS NOT NULL");
    q.push("    BEGIN");
    q.push("        INSERT INTO #ROCandidates(RONumer, Zrodlo)");
    q.push("        SELECT DISTINCT ro.TrN_NumerPelny, N'TraNagRelacje'");
    q.push("        FROM CDN.TraNagRelacje r");
    q.push("        JOIN CDN.TraNag ro");
    q.push("            ON ro.TrN_TrNID = CASE WHEN r.TrR_TrNId = @FSTrNID THEN r.TrR_FaId");
    q.push("                                    WHEN r.TrR_FaId  = @FSTrNID THEN r.TrR_TrNId");
    q.push("                               END");
    q.push("        WHERE (r.TrR_TrNId = @FSTrNID OR r.TrR_FaId = @FSTrNID)");
    q.push("          AND ro.TrN_NumerPelny LIKE @ROPrefix + N'%'");
    q.push("          AND ro.TrN_PodmiotTyp = @PodmiotTyp");
    q.push("          AND ro.TrN_PodID      = @PodmiotID;");
    q.push("    END");
    q.push("");
    q.push("    IF @RONumer IS NULL AND OBJECT_ID('CDN.TraElemRelacje') IS NOT NULL");
    q.push("    BEGIN");
    q.push("        INSERT INTO #ROCandidates(RONumer, Zrodlo)");
    q.push("        SELECT DISTINCT ro.TrN_NumerPelny, N'TraElemRelacje'");
    q.push("        FROM CDN.TraElem fsE");
    q.push("        JOIN CDN.TraElemRelacje r");
    q.push("            ON (r.TeR_ParentId = fsE.TrE_TrEID OR r.TeR_ChildId = fsE.TrE_TrEID)");
    q.push("        JOIN CDN.TraElem roE");
    q.push("            ON roE.TrE_TrEID = CASE WHEN r.TeR_ParentId = fsE.TrE_TrEID THEN r.TeR_ChildId");
    q.push("                                     ELSE r.TeR_ParentId END");
    q.push("        JOIN CDN.TraNag ro ON ro.TrN_TrNID = roE.TrE_TrNId");
    q.push("        WHERE fsE.TrE_TrNId      = @FSTrNID");
    q.push("          AND ro.TrN_NumerPelny  LIKE @ROPrefix + N'%'");
    q.push("          AND ro.TrN_PodmiotTyp  = @PodmiotTyp");
    q.push("          AND ro.TrN_PodID       = @PodmiotID;");
    q.push("    END");
    q.push("");
    q.push("    IF @RONumer IS NULL");
    q.push("    BEGIN");
    q.push("        IF (SELECT COUNT(DISTINCT RONumer) FROM #ROCandidates) = 1");
    q.push("            SELECT @RONumer = MIN(RONumer) FROM #ROCandidates;");
    q.push("    END");
    q.push("");
    q.push("    IF @RONumer IS NULL");
    q.push("        THROW 51004, 'Nie udało się jednoznacznie ustalić numeru RO. Ustaw MANUAL_RO_NUMER w kodzie.', 1;");
    q.push("");
    q.push("    DECLARE @RONumerEsc nvarchar(120) =");
    q.push("        REPLACE(REPLACE(REPLACE(@RONumer, N'[', N'[[]'), N'%', N'[%]'), N'_', N'[_]');");
    q.push("");
    q.push("    DECLARE @IstniejaceZaliczki decimal(15,2);");
    q.push("");
    q.push("    SELECT @IstniejaceZaliczki = ISNULL(SUM(Zal_Kwota), 0)");
    q.push("    FROM CDN.Zaliczki");
    q.push("    WHERE Zal_DokumentTyp = 1");
    q.push("      AND Zal_DokumentID  = @FSTrNID");
    q.push("      AND Zal_Zaznaczenie = 1;");
    q.push("");
    q.push("    DECLARE @LimitDoDodania decimal(15,2) = @FSBrutto - @IstniejaceZaliczki;");
    q.push("    IF @LimitDoDodania < 0 SET @LimitDoDodania = 0;");
    q.push("");
    q.push("    DECLARE @Inserted TABLE");
    q.push("    (");
    q.push("        Zal_ZalID      int NULL,");
    q.push("        Zal_BZpId      int,");
    q.push("        BZp_NumerPelny nvarchar(60),");
    q.push("        Zal_Kwota      decimal(15,2)");
    q.push("    );");
    q.push("");
    q.push("    ;WITH KP AS");
    q.push("    (");
    q.push("        SELECT");
    q.push("            BZp_BZpID,");
    q.push("            BZp_NumerPelny,");
    q.push("            BZp_DataDok,");
    q.push("            CAST(ABS(BZp_Kwota) - ABS(BZp_KwotaRoz) AS decimal(15,2)) AS KP_DoRozliczenia,");
    q.push("            ISNULL(BZp_OpeZalId, 0)                                   AS FallbackOpeId,");
    q.push("            ISNULL(BZp_StaZalId, 0)                                   AS FallbackStaId,");
    q.push("            ISNULL(NULLIF(BZp_OpeZalKod, ''), 'AUTO')                 AS FallbackOpeKod,");
    q.push("            ISNULL(NULLIF(BZp_OpeZalNazwisko, N''), N'Funkcja dodatkowa') AS FallbackOpeNazwisko");
    q.push("        FROM CDN.BnkZapisy");
    q.push("        WHERE BZp_PodmiotTyp = @PodmiotTyp");
    q.push("          AND BZp_PodmiotID  = @PodmiotID");
    q.push("          AND (BZp_Waluta IS NULL OR BZp_Waluta = N'')");
    q.push("          AND BZp_Opis       LIKE N'%' + @RONumerEsc + N'%'");
    q.push("          AND BZp_Kierunek   = 1");
    q.push("          AND CAST(ABS(BZp_Kwota) - ABS(BZp_KwotaRoz) AS decimal(15,2)) > 0");
    q.push("          AND NOT EXISTS");
    q.push("          (");
    q.push("              SELECT 1 FROM CDN.Zaliczki z");
    q.push("              WHERE z.Zal_DokumentTyp = 1");
    q.push("                AND z.Zal_DokumentID  = @FSTrNID");
    q.push("                AND z.Zal_BZpId       = BZp_BZpID");
    q.push("          )");
    q.push("    ),");
    q.push("    KP_PLAN AS");
    q.push("    (");
    q.push("        SELECT");
    q.push("            KP.*,");
    q.push("            CAST(ISNULL(SUM(KP_DoRozliczenia) OVER");
    q.push("            (");
    q.push("                ORDER BY BZp_DataDok, BZp_BZpID");
    q.push("                ROWS BETWEEN UNBOUNDED PRECEDING AND 1 PRECEDING");
    q.push("            ), 0) AS decimal(15,2)) AS SumaPrzed");
    q.push("        FROM KP");
    q.push("    ),");
    q.push("    DO_INSERT AS");
    q.push("    (");
    q.push("        SELECT");
    q.push("            BZp_BZpID,");
    q.push("            BZp_NumerPelny,");
    q.push("            CASE");
    q.push("                WHEN @LimitDoDodania <= 0                             THEN CAST(0 AS decimal(15,2))");
    q.push("                WHEN SumaPrzed >= @LimitDoDodania                     THEN CAST(0 AS decimal(15,2))");
    q.push("                WHEN SumaPrzed + KP_DoRozliczenia <= @LimitDoDodania  THEN KP_DoRozliczenia");
    q.push("                ELSE CAST(@LimitDoDodania - SumaPrzed AS decimal(15,2))");
    q.push("            END AS Zal_Kwota,");
    q.push("            FallbackOpeId, FallbackStaId, FallbackOpeKod, FallbackOpeNazwisko");
    q.push("        FROM KP_PLAN");
    q.push("    )");
    q.push("    INSERT INTO CDN.Zaliczki");
    q.push("    (");
    q.push("        Zal_DokumentTyp,");
    q.push("        Zal_DokumentID,");
    q.push("        Zal_BZpId,");
    q.push("        Zal_Zaznaczenie,");
    q.push("        Zal_Kwota,");
    q.push("        Zal_OpeZalId,");
    q.push("        Zal_StaZalId,");
    q.push("        Zal_TS_Zal,");
    q.push("        Zal_OpeModId,");
    q.push("        Zal_StaModId,");
    q.push("        Zal_TS_Mod,");
    q.push("        Zal_OpeModKod,");
    q.push("        Zal_OpeModNazwisko,");
    q.push("        Zal_OpeZalKod,");
    q.push("        Zal_OpeZalNazwisko");
    q.push("    )");
    q.push("    OUTPUT");
    q.push("        INSERTED.Zal_ZalID,");
    q.push("        INSERTED.Zal_BZpId,");
    q.push("        NULL,");
    q.push("        INSERTED.Zal_Kwota");
    q.push("    INTO @Inserted");
    q.push("    SELECT");
    q.push("        1,");
    q.push("        @FSTrNID,");
    q.push("        d.BZp_BZpID,");
    q.push("        1,");
    q.push("        d.Zal_Kwota,");
    q.push("        CASE WHEN @AudytFallback = 0 THEN @CurOpeId ELSE d.FallbackOpeId END,");
    q.push("        d.FallbackStaId,");
    q.push("        GETDATE(),");
    q.push("        CASE WHEN @AudytFallback = 0 THEN @CurOpeId ELSE d.FallbackOpeId END,");
    q.push("        d.FallbackStaId,");
    q.push("        GETDATE(),");
    q.push("        LEFT(CASE WHEN @AudytFallback = 0 THEN @CurOpeKod ELSE d.FallbackOpeKod END, 20),");
    q.push("        CASE WHEN @AudytFallback = 0 THEN @CurOpeNazwisko ELSE d.FallbackOpeNazwisko END,");
    q.push("        LEFT(CASE WHEN @AudytFallback = 0 THEN @CurOpeKod ELSE d.FallbackOpeKod END, 20),");
    q.push("        CASE WHEN @AudytFallback = 0 THEN @CurOpeNazwisko ELSE d.FallbackOpeNazwisko END");
    q.push("    FROM DO_INSERT d");
    q.push("    WHERE d.Zal_Kwota > 0;");
    q.push("");
    q.push("    UPDATE i");
    q.push("    SET BZp_NumerPelny = b.BZp_NumerPelny");
    q.push("    FROM @Inserted i");
    q.push("    JOIN CDN.BnkZapisy b ON b.BZp_BZpID = i.Zal_BZpId;");
    q.push("");
    q.push("    DECLARE @Dodano      int           = (SELECT COUNT(*)                   FROM @Inserted);");
    q.push("    DECLARE @KwotaDodana decimal(15,2) = (SELECT ISNULL(SUM(Zal_Kwota), 0) FROM @Inserted);");
    q.push("    DECLARE @DodaneKP    nvarchar(max);");
    q.push("");
    q.push("    SELECT @DodaneKP = STUFF((");
    q.push("        SELECT N', ' + BZp_NumerPelny + N' = ' + CONVERT(nvarchar(32), Zal_Kwota)");
    q.push("        FROM @Inserted");
    q.push("        ORDER BY Zal_BZpId");
    q.push("        FOR XML PATH(''), TYPE");
    q.push("    ).value('.', 'nvarchar(max)'), 1, 2, N'');");
    q.push("");
    q.push("    COMMIT;");
    q.push("");
    q.push("    SELECT");
    q.push("        'OK'                   AS Status,");
    q.push("        @FSTrNID               AS FSTrNID,");
    q.push("        @FSNumerPelny          AS FSNumer,");
    q.push("        @RONumer               AS RONumer,");
    q.push("        @Dodano                AS DodanoPozycji,");
    q.push("        @KwotaDodana           AS DodanoKwota,");
    q.push("        ISNULL(@DodaneKP, N'') AS DodaneKP,");
    q.push("        @TrNBufor              AS Bufor,");
    q.push("        @AudytFallback         AS AudytFallback;");
    q.push("");
    q.push("END TRY");
    q.push("BEGIN CATCH");
    q.push("    IF @@TRANCOUNT > 0 ROLLBACK;");
    q.push("    SELECT");
    q.push("        'ERROR'          AS Status,");
    q.push("        ERROR_NUMBER()   AS ErrorNumber,");
    q.push("        ERROR_MESSAGE()  AS ErrorMessage;");
    q.push("END CATCH;");

    var sql = q.join("\r\n");
    var rs  = null;

    try {
        rs = cn.Execute(sql);
    } catch (eExec) {
        shell.Popup(
            "Błąd wykonania SQL:\n\n" + eExec.message,
            0, "KP -> zaliczki FS", 16
        );
        throw eExec;
    }

    if (rs !== null && !rs.EOF) {

        var status = asText(rs.Fields("Status").Value);

        if (status === "ERROR") {

            shell.Popup(
                "Błąd funkcji KP -> zaliczki FS.\n\n" +
                "Nr błędu : " + asText(rs.Fields("ErrorNumber").Value) + "\n" +
                "Treść    : " + asText(rs.Fields("ErrorMessage").Value),
                0, "KP -> zaliczki FS", 16
            );

        } else {

            var dodano       = asInt(rs.Fields("DodanoPozycji").Value, 0);
            var jestBufor    = asInt(rs.Fields("Bufor").Value, 0);
            var audytFallback = asInt(rs.Fields("AudytFallback").Value, 0);
            var ikona        = dodano > 0 ? 64 : 48;
            var tresc;

            if (dodano === 0) {
                tresc =
                    "Nie dopisano nowych zaliczek.\n\n" +
                    "FS: " + asText(rs.Fields("FSNumer").Value) + "\n" +
                    "RO: " + asText(rs.Fields("RONumer").Value)  + "\n\n" +
                    "Możliwe przyczyny:\n" +
                    "  - Wszystkie pasujące KP są już dopisane.\n" +
                    "  - Brak KP (PLN, wpływ) z opisem zawierającym numer RO.\n" +
                    "  - Limit kwotowy FS jest już wyczerpany.";
            } else {
                tresc =
                    "Zakończono dopisywanie zaliczek do FS.\n\n" +
                    "FS: "             + asText(rs.Fields("FSNumer").Value)       + "\n" +
                    "RO: "             + asText(rs.Fields("RONumer").Value)        + "\n" +
                    "Dodano pozycji: " + asText(rs.Fields("DodanoPozycji").Value) + "\n" +
                    "Dodano kwotę: "   + asText(rs.Fields("DodanoKwota").Value)   + "\n\n" +
                    "KP: " + asText(rs.Fields("DodaneKP").Value);

                if (jestBufor !== 0) {
                    tresc += "\n\nFS jest w buforze — zapisz dokument,\n" +
                             "aby zaliczki stały się widoczne na formularzu.";
                }
            }

            if (audytFallback !== 0) {
                tresc += "\n\nUWAGA: nie udało się rozwiązać bieżącego operatora\n" +
                         "sesji (CDN.OpeDaneOperatora) — zapisy w CDN.Zaliczki\n" +
                         "oznaczono danymi operatora z oryginalnego KP.\n" +
                         "Zgłoś to do weryfikacji wdrożeniowca.";
            }

            shell.Popup(tresc, 0, "KP -> zaliczki FS", ikona);

        }

    } else {

        shell.Popup(
            "Funkcja zakończona, ale SQL nie zwrócił wyniku.",
            0, "KP -> zaliczki FS", 48
        );

    }

    if (rs !== null) {
        try { rs.Close(); } catch (eClose) {}
        rs = null;
    }

} catch (e) {
    try {
        shell.Popup(
            "Błąd JS funkcji dodatkowej:\n\n" + e.message,
            0, "KP -> zaliczki FS", 16
        );
    } catch (e2) {}
}
```

### Konfiguracja w Optimie
Lista lub formularz FS → funkcja dodatkowa typu SQL+JS → uruchomienie manualne (F11) → kontekst zaznaczonego/bieżącego dokumentu. `MANUAL_FS_TRNID` i `MANUAL_RO_NUMER` służą wyłącznie do diagnostyki — w pracy produkcyjnej muszą być 0/"".

### Testy
1. Pozytywny: FS z RO wykrytym automatycznie przez TraNagRelacje, KP w PLN z opisem zawierającym numer RO → zaliczka dopisana.
2. Brzegowy: powtórne uruchomienie w tej samej sesji Optimy (test czyszczenia #ROCandidates); KP w walucie obcej z tym samym opisem (powinno zostać odfiltrowane); FS bez RO w TraNagRelacje, ale z RO w TraElemRelacje; brak rozwiązania operatora (sprawdzić czy AudytFallback=1 pojawia się w popupie).
3. Kontrolny SELECT przed zmianą: `SELECT * FROM CDN.Zaliczki WHERE Zal_DokumentTyp=1 AND Zal_DokumentID=<FSTrNID>;`
4. Kontrola po wykonaniu: porównanie Zal_OpeZalId/Nazwisko nowych wierszy z rzeczywiście zalogowanym operatorem.

### Otwarte NEEDS VERIFICATION
- Zachowanie `CDN.OpeDaneOperatora` w realnej, aktywnej sesji desktopowego klienta Optimy (potwierdzony tylko wzorzec wywołania z katalogu wyzwalaczy, nie przetestowany z żywym kontekstem sesji klienckiej).
- Brak potwierdzonego źródła bieżącej stacji (`Zal_StaZalId`) — używany fallback z oryginalnego zapisu KP.
- Znaczenie biznesowe `Zal_Zaznaczenie` (czy niezaznaczone zaliczki powinny wchodzić do limitu kwotowego) — nieustalone w dostępnej dokumentacji.
- Prefiks numeracji RO (`"RO/"`) jest założeniem instalacyjnym, nie uniwersalną regułą Optimy — do potwierdzenia per klient.
- Bezpośredni INSERT do `CDN.Zaliczki` omija logikę biznesową Optimy — wymaga retestu po każdej aktualizacji wersji programu.

### Ryzyka
Wykonywać najpierw na kopii bazy. Backup przed produkcyjnym wdrożeniem. Brak blokady globalnej poza pojedynczym dokumentem FS (UPDLOCK/HOLDLOCK ograniczone do wiersza FS) — przy bardzo rzadkim równoległym uruchomieniu na tym samym dokumencie przez dwóch operatorów jednocześnie możliwy nieznaczny wyścig przy liczeniu limitu.