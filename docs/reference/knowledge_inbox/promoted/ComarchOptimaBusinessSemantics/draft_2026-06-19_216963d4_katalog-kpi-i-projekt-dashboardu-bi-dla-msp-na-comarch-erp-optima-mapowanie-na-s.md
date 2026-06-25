# Katalog KPI i projekt dashboardu BI dla MSP na Comarch ERP Optima (mapowanie na schemat CDN)
- draftId: `draft_2026-06-19_216963d4_katalog-kpi-i-projekt-dashboardu-bi-dla-msp-na-comarch-erp-optima-mapowanie-na-s`
- kbNamespace: `ComarchOptimaBusinessSemantics`
- status: `promoted`
- promotedAt: `2026-06-19T14:37:29.656Z`
- reviewNote: Approved and exported from dashboard
## Content
## TL;DR
- Solidna, uniwersalna warstwa metodologiczna (~40 wskaźników w 8 obszarach: finanse/rentowność, płynność, należności/zobowiązania, magazyn, sprzedaż, kontrahenci) z wzorami, sensem biznesowym, wizualizacją i progiem alertu, zmapowana na realne tabele CDN.
- Większość zaawansowanych KPI (ABC/XYZ, RFM, HHI, CCC, EBITDA) NIE jest dostępna jako gotowa funkcja Comarch — trzeba je liczyć samodzielnie na bazie CDN.
- Comarch daje standardowo wbudowany moduł "Analizy BI" (raporty drag&drop) oraz osobno płatny Comarch BI Point (197 raportów + 9 dashboardów, OLAP).
- Rekomendowana architektura dashboardu: piramida 3 poziomów (zarząd: 7-9 KPI → kierownicy → drill-down do dokumentu).

## Mapowanie KPI na realny schemat CDN (zweryfikowane na bazie CDN_TEST, instancja OPTIMA)

### Sprzedaż/zakupy/marża
- CDN.TraNag — nagłówki dokumentów. Kolumny: TrN_TypDokumentu (301=FZ, 302=FA, 305/306/308/309, 320=PA), TrN_Rodzaj, TrN_PodID/OdbID/PlatnikID, TrN_RazemNetto/VAT/Brutto, TrN_WartoscZakupu (koszt - baza marży), TrN_Waluta+KursL/M, TrN_Kategoria/KatID, TrN_Termin, TrN_MagZrdId/MagDocId, TrN_Rabat/RabatWartosc, TrN_OpeZalKod/OpeModKod, TrN_NrKSeF.
- CDN.TraElem — pozycje. TrE_TwrKod/TwrNazwa, TrE_MagId, TrE_Ilosc/IloscJM, TrE_WartoscNetto/Brutto, TrE_WartoscZakupu/WartoscZakupuWylicz (marża pozycji = WartoscNetto - WartoscZakupu), TrE_Cena0/CenaW/CenaT, TrE_Rabat/RabatPromocyjny/RabatKorekta.

### Kontrahenci
- CDN.Kontrahenci — Knt_Kod, Knt_Grupa, Knt_LimitKredytu/LimitKredytuWykorzystany/LimitFlag, Knt_LimitPrzeterKredytFlag/Wartosc, Knt_Termin/TerminPlat, Knt_MaxZwloka, Knt_OpiekunTyp, Knt_NipE/Nip.

### Magazyn
- CDN.Towary — Twr_Kod, Twr_Typ, Twr_IloscMin/Max/Zam (baza alertu stockout), Twr_MarzaMin/MinCenaMarza, Twr_KodDostawcy, Twr_ProducentKod.
- CDN.TwrZasoby — stany per magazyn: TwZ_MagId, TwZ_Ilosc, TwZ_Wartosc, TwZ_Cena.
- CDN.Magazyny — Mag_MagId, Mag_Symbol, Mag_Nazwa, Mag_Typ.
- CDN.RemanentNag/RemanentElem — inwentaryzacje.
- CDN.Kategorie — Kat_Typ, Kat_KodOgolny/KodSzczegol, Kat_RodzajZakupu.

### Płynność, należności/zobowiązania, księgowość
- CDN.BnkZdarzenia (preliminarz płatności) — BZd_Kwota, BZd_KwotaRoz, BZd_Termin (baza agingu i DSO/DPO), BZd_Kierunek, BZd_Rozliczono, BZd_PodmiotID. GŁÓWNA tabela do agingu i prognozy wpływów/wydatków.
- CDN.BnkZapisy (faktyczne zapisy K/B) — BZp_Kwota, BZp_Kierunek, BZp_DataDok, BZp_Rozliczono.
- CDN.KsiRozrachunki — pełna księgowość: KRo_Kwota, KRo_SumRozliczen, KRo_TerminPlatnosci, KRo_Strona, KRo_Konto.
- CDN.DekretyNag/DekretyElem + CDN.Konta + CDN.Obroty — dekrety, plan kont, obroty/salda (zespoły 4/7) - baza struktury kosztów/przychodów, EBITDA, cash flow operacyjnego.

### Zamówienia/operacje
- CDN.DokNag/DokElem — oferty, zamówienia - baza fulfillment rate, backlogu.
- CDN.VatNag/TraVat — rejestry VAT.

### Zastrzeżenie metodologiczne
Baza testowa CDN_TEST ma bardzo mało rekordów, więc agregaty liczbowe NIE są reprezentatywne biznesowo - wartość eksploracji to wyłącznie potwierdzenie nazw tabel/kolumn i typów danych, nie wzorców biznesowych.

## Katalog KPI wg obszarów

### Finanse i rentowność
- Marża brutto = (Przychód - COGS)/Przychód. CDN: TraNag.TrN_RazemNetto - TrN_WartoscZakupu, lub per pozycja TraElem.
- Marża netto = Zysk netto/Przychód. CDN: Obroty/DekretyNag (zespół 7 vs 4/5).
- ROS = EBIT/Przychód netto - uwaga: definicja niejednoznaczna w źródłach (EBIT vs zysk netto), przyjęto wariant EBIT.
- EBITDA uproszczona = Zysk netto + Odsetki + Podatki + Amortyzacja. CDN: DekretyNag/Elem, Konta, Obroty.
- Dynamika MoM/YoY, narastanie YTD - agregacje na TrN_DataDok.
- Budżet vs wykonanie - tabele BudzetNag/BudzetElem istnieją w schemacie - zawartość do zweryfikowania.
- Cash flow operacyjny (metoda pośrednia) = Zysk netto + amortyzacja +/- delta kapitału obrotowego. CDN: DekretyNag, KsiRozrachunki, BnkZapisy.

### Płynność i kapitał obrotowy
- DSO = (Średnie należności/Sprzedaż na kredyt) x dni. CDN: KsiRozrachunki/BnkZdarzenia + TraNag.
- DPO = (Średnie zobowiązania/COGS) x dni.
- DIO = (Średni zapas/COGS) x dni = 365/rotacja zapasów.
- CCC = DIO + DSO - DPO.
- Current ratio = Aktywa obrotowe/Zobowiązania krótkoterminowe (zdrowy zakres branżowo 1,5-2,0).
- Quick ratio = (Aktywa obrotowe - Zapasy)/Zobowiązania krótkoterminowe (>=1 zwykle dobre).

### Należności i zobowiązania (aging)
- Przedziały: bieżące, 1-30, 31-60, 61-90, >90 dni - liczone od BZd_Termin/KRo_TerminPlatnosci, nie od daty wystawienia.
- Alert: >20-25% AR po terminie; pojedynczy klient >15-20% całości AR.
- Prognoza wpływów/wydatków - kalendarz płatności z BnkZdarzenia.

### Magazyn
- Rotacja zapasów = COGS/Średni zapas. CDN: TwrZasoby, TraElem.
- ABC - sortowanie wg wartości obrotu/marży, podział 80/15/5. NIE jest gotową funkcją Comarch - do zbudowania samodzielnie SQL-em na TraElem+Towary.
- XYZ - współczynnik zmienności popytu; macierz ABC x XYZ = 9 grup.
- Dead stock/wolnorotujące - częściowo gotowe w Optimie: raporty 7.19, 7.20, 7.23 w module Analizy BI.
- Stockout risk - Towary.Twr_IloscMin vs TwrZasoby.TwZ_Ilosc.

### Sprzedaż i kontrahenci
- Pareto 80/20 - 20% klientów/produktów = ~80% sprzedaży/marży.
- HHI = suma(udział_i)^2 - koncentracja portfela klientów. Progi: <1500 niska, 1500-2500 umiarkowana, >2500 wysoka.
- RFM - kwintyle (1-5) dla Recency/Frequency/Monetary per Kontrahenci+TraNag. Recency ma najwyższą siłę predykcyjną. Rekalkulacja min. miesięczna.
- Churn/retencja - liczone na poziomie konta i wartości w B2B.

## Specyfika narzędziowa Comarch

### Moduł "Analizy BI" (wbudowany, desktopowy)
- Tabela przestawna, drag&drop, subskrypcje mailowe/SMS, eksport Excel, formatowanie warunkowe, TOP N.
- Nazwane raporty potwierdzone w oficjalnej Bazie Wiedzy Comarch: 1.26 Analiza RO według kontrahentów, 1.27 Analiza RO pozostałych do realizacji, 1.30 Faktury nierozliczone, 23 Raport Sprzedaży z Opisem Analitycznym, 7.19 Ranking produktów zalegających, 7.20/7.23 Zaleganie w przedziałach, 7.18 Produkty z dostaw, 14 Raport Zasobów Magazynowych z Dostaw, 5.09 Ewidencja dodatkowa przychodów i kosztów, 25 Raport Księgowości (KK), 08 Raport Rejestrów VAT, 10.06/10.07 raporty CRM.
- WAŻNE: rotacja magazynowa i struktura wiekowa należności/zobowiązań są opisane w STARSZYM module "Analizy", NIE w "Analizy BI".
- Dokładna łączna liczba raportów w Analizy BI nieoficjalna (partnerzy: rozbieżnie 50/100/147/150).

### Comarch BI Point (osobny, płatny produkt)
- Aplikacja serwerowa, przeglądarka (desktop+mobile), kostki OLAP z drilldown, wieloźródłowość, asystent AI ChatERP, alerty progowe.
- Oficjalnie potwierdzone: 197 standardowych raportów + 9 dashboardów w 5 obszarach: Handel, Logistyka, Płatności, Płace i Kadry, Księgowość.

### Brak gotowych funkcji w Comarch
- Analiza ABC/XYZ, RFM, HHI, CCC, EBITDA - wymagają budowy własnej (widoki SQL na replice CDN + Power BI/Tableau/Qlik/Analizy BI).

## Dobre praktyki dashboardu zarządczego
- 5-7 (max 9) głównych KPI na widok zarządu; reszta przez drill-down.
- Piramida 3 poziomów: strategiczny (zarząd, miesięcznie) - taktyczny (kierownicy, tygodniowo) - operacyjny (drill-down do dokumentu).
- Wizualizacje: waterfall (dekompozycja wyniku, CCC), bullet chart (wykonanie vs cel), heatmapa (aging klient x przedział), sparkline (mikrotrend), wykres narastający (YTD), tabela odchyleń.
- Reguła 3-30-300: KPI czytelne w 3s, kontekst w 30s, szczegół w 300s.
- Kolor jako sygnał (traffic lights); KPI zawsze z celem/trendem/baseline.

## Rekomendacja wdrożeniowa (3 fazy)
1. Fundament (2-4 tyg.): widoki SQL na replice CDN (NIE na produkcyjnej bazie) + 7-9 KPI zarządczych. Walidacja z księgowością (różnice <1-2%).
2. Warstwa operacyjna: ABC/XYZ zapasów, RFM klientów, HHI+TOP klientów, budżet vs wykonanie. Progi alertów kalibrować na 12 mies. danych historycznych.
3. Automatyzacja: alerty KPI + subskrypcje + drill-down do dokumentu (DokNag/DokElem, TraNag).

Decyzja narzędziowa: raporty tabelaryczne/Excel -> wbudowane Analizy BI. Interaktywne dashboardy/OLAP/alerty/mobile -> BI Point albo Power BI/Tableau/Qlik na replice CDN.

## Zastrzeżenia
- Progi alertów branżowo zależne - punkt startowy, nie sztywna norma.
- Definicja ROS sprzeczna w źródłach (EBIT vs zysk netto).
- EBITDA nie jest miarą GAAP, ignoruje kapitał obrotowy i CAPEX.
- Eksploracja CDN_TEST potwierdziła wyłącznie strukturę, nie wzorce biznesowe (mała próbka).
- Materiały partnerów Comarch czasem mieszają moduły "Analizy" i "Analizy BI" - weryfikować na posiadanej wersji.