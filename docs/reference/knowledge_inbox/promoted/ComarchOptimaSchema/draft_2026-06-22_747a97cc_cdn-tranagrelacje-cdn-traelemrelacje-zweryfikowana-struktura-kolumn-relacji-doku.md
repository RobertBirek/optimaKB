# CDN.TraNagRelacje / CDN.TraElemRelacje — zweryfikowana struktura kolumn relacji dokumentów
- draftId: `draft_2026-06-22_747a97cc_cdn-tranagrelacje-cdn-traelemrelacje-zweryfikowana-struktura-kolumn-relacji-doku`
- kbNamespace: `ComarchOptimaSchema`
- status: `promoted`
- promotedAt: `2026-06-22T08:55:47.714Z`
- tags: `TraNagRelacje`, `TraElemRelacje`, `schema-verified`, `OpeDaneOperatora`
- reviewNote: Approved from inbox row
## Content
## CDN.TraNagRelacje
Kolumny (zweryfikowane przez describe_table na żywej bazie firmowej klienta):
- TrR_TrRId (int, PK)
- TrR_TrNTyp (smallint) — typ dokumentu "źródłowego" w relacji (DDfId/typ instalacyjny, NIE globalny enum Optimy)
- TrR_TrNId (int) — TrN_TrNID dokumentu źródłowego
- TrR_FaTyp (smallint) — typ dokumentu powiązanego
- TrR_FaId (int) — TrN_TrNID dokumentu powiązanego
- TrR_Flaga (smallint) — znaczenie nieustalone [NEEDS VERIFICATION]

Relacja jest przechowywana SYMETRYCZNIE — każda relacja A↔B ma dwa wiersze (A→B i B→A), potwierdzone na danych produkcyjnych klienta.

Bezpieczny JOIN do znalezienia dokumentu powiązanego z dokumentem o TrN_TrNID = @X:
```sql
SELECT DISTINCT ro.*
FROM CDN.TraNagRelacje r
JOIN CDN.TraNag ro
    ON ro.TrN_TrNID = CASE WHEN r.TrR_TrNId = @X THEN r.TrR_FaId
                            WHEN r.TrR_FaId  = @X THEN r.TrR_TrNId END
WHERE r.TrR_TrNId = @X OR r.TrR_FaId = @X;
```

## CDN.TraElemRelacje
Kolumny:
- TeR_TeRId (int, PK)
- TeR_ParentTyp (smallint)
- TeR_ParentId (int) — TrE_TrEID elementu nadrzędnego
- TeR_ChildTyp (smallint)
- TeR_ChildId (int) — TrE_TrEID elementu podrzędnego
- TeR_Flaga (smallint) — znaczenie nieustalone [NEEDS VERIFICATION]
- TeR_Info, TeR_Info2 (decimal) — znaczenie nieustalone [NEEDS VERIFICATION]

ParentId/ChildId wskazują na CDN.TraElem.TrE_TrEID (element), NIE na TrE_TrNId (nagłówek) — odnaleziony nagłówek przez dodatkowy JOIN do CDN.TraElem.TrE_TrNId.

## Ważna pułapka przy projektowaniu funkcji dodatkowych
Naiwna heurystyka "weź kolumny int/smallint, których nazwa nie zawiera 'Typ'" jest BŁĘDNA dla obu tabel — przepuszcza PK (TrR_TrRId / TeR_TeRId) i pole Flaga (TrR_Flaga / TeR_Flaga), generując 3-4 kandydatów kolumn zamiast właściwych 2. Skutek: błędne dynamiczne JOIN-y w funkcjach dodatkowych. Zawsze używać nazw kolumn zweryfikowanych przez describe_table, nie heurystyki typu danych.

## CDN.TraNag — uwaga strukturalna
TrN_TrNID jest unikalnym PK niezależnie od typu dokumentu. Nie istnieje kolumna TrN_TrNTyp na CDN.TraNag (typ dokumentu trzymany jest w TrN_TypDokumentu, inny zakres wartości niż TrR_TrNTyp/TrR_FaTyp w TraNagRelacje, które odnoszą się raczej do DDfId/konfiguracji instalacyjnej). WHERE TrN_TrNID = @X jest bezpieczne i wystarczające do jednoznacznej identyfikacji dokumentu.

## CDN.OpeDaneOperatora
Procedura systemowa: `EXEC CDN.OpeDaneOperatora @OpeId INOUT int, @OpeKod INOUT varchar(20), @OpeNazwisko INOUT nvarchar(50), @Log INOUT int`.
Potwierdzona w trigger.csv jako wzorzec pobrania danych operatora z kontekstu bieżącej sesji SQL. Test na połączeniu bez kontekstu Optimy (np. narzędzie administracyjne) zwraca @OpeId=0, OpeKod/Nazwisko='' — zgodne z hipotezą odczytu CONTEXT_INFO sesji klienta Optimy. [NEEDS VERIFICATION] zachowanie w realnej, aktywnej sesji desktopowego klienta Optimy (z funkcji dodatkowej) — nie testowane bezpośrednio, tylko wzorzec wywołania. Brak w tej procedurze danych stacji (Sta/Stacja) — tylko operator.

Tags: TraNagRelacje, TraElemRelacje, TraNag, OpeDaneOperatora, relacje dokumentów, schema verification