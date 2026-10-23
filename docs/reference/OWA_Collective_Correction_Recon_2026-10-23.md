# Korekta zbiorcza FA — rozpoznanie źródeł do planu

To notatka diagnostyczna, nie zatwierdzona treść korpusu ani dowód działania runtime.

## Źródła odczytane

1. downloads/google_drive/additional_functions/Przyklady użycia obiektów COM 2016 - NET - XPT - JS - VB60 - VC/JS/KorektaZbiorczaFA.js
   - Odczyt jako cp1250; SHA256 11911b941a1c51f1da75e9ac7b49b794576d3ad40a50fc43db3b762e89d32305.
   - L5 i L7: historyczny przykład utworzenia korekty zbiorczej dla FA.
   - L58: pojedynczy obiekt rFaktura przez CDN.DokumentyHaMag.AddNew().
   - L61–63: w tym przykładzie Korekta=6, Rodzaj=302010, TypDokumentu=302.
   - L66: definicja wyszukiwana przez DDf_Symbol='FKOR'.
   - L75: UstawElemntyKorektyZbiorczejDokID przyjmuje w przykładzie listę dwóch ID faktur.
   - Skryptu nie uruchamiano. Pominięto sekcję logowania; nie kopiować jej do dokumentacji lub fixture'ów.
2. docs/reference/Struktura_Bazy_2026.4.1.md L169148–169156: dokument „Faktura sprzedaży korekta zbiorcza”, liczby 302 i 302009 w tabeli, a dalej „Faktura sprzedaży korekta danych”. To nie jest automatycznie zgodne z historycznym Rodzaj=302010; znaczenie i różnicę wersji należy jawnie zachować.
3. docs/reference/OpenSPG_KB_Operational_Memory.md L411–414 i ComarchOptimaKB_CorpusCoverageAudit.md L94–103 potwierdzają odnalezienie pliku, ale same nie dowodzą wszystkich twierdzeń biznesowych draftów.
4. Dwie promowane wersje: draft_2026-07-15_0570f3dd_korekta-zbiorcza-fa oraz draft_2026-07-17_941acb19_encja-korekta-zbiorcza-fa, w docs/reference/knowledge_inbox/promoted/OWAOntology/.
5. Odczyt samych metadanych katalogu 354 narzędzi OptimaMCP nie znalazł nazwy/opisu zawierającego correction/korekt. Nie wywoływano narzędzi biznesowych. Brak takiej pozycji w tym katalogu NIE jest dowodem nieistnienia endpointu API ani ograniczeń wszystkich wersji MCP.

## Wstępna rekomendacja

Nie wybierać bezwarunkowo żadnej promowanej wersji. Przykład pokazuje tworzenie jednego obiektu korekty i podanie listy faktur, więc hipoteza „po jednym FSKOR dla każdej faktury” nie ma tu wsparcia. Pokazuje też interfejs COM, nie działanie aktualnego endpointu create_sales_correction. Nie wolno przepisywać kodów historycznego przykładu jako zweryfikowanego mapowania SQL 2026.

W implementacji planu przygotować pełną tabelę twierdzeń i rekomendację ręcznie zatwierdzonej syntezy, z UNKNOWN dla niepotwierdzonego obecnego API, skutków księgowych/VAT i dokładnych relacji. Do tego czasu niejednoznaczność pozostaje FAIL; nie zmieniać korpusu.

## Dodatkowa kontrola wersji

Porównanie splitDraftContent(content,1800) dla wszystkich 134 promowanych snapshots daje cztery grupy z różną treścią: Potwierdzenie Salda PS, Faktura Proforma FPF, Wydanie Zewnętrzne WZ, Korekta zbiorcza FA. Poprzednie 66/67 odnosiło się tylko do rewizji wybranych przez dotychczasową heurystykę, nie do spójności wszystkich zatwierdzonych wersji.
