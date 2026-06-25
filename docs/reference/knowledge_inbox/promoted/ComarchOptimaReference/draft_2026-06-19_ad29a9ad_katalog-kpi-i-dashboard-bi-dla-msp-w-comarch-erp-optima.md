# Katalog KPI i dashboard BI dla MŚP w Comarch ERP Optima
- draftId: `draft_2026-06-19_ad29a9ad_katalog-kpi-i-dashboard-bi-dla-msp-w-comarch-erp-optima`
- kbNamespace: `ComarchOptimaReference`
- status: `promoted`
- promotedAt: `2026-06-19T12:32:45.736Z`
- tags: `KPI`, `raporty`, `dashboard`, `BI`, `Comarch ERP Optima`, `MŚP`, `wskaźniki`, `analizy`
- reviewNote: Bulk approved 2 drafts from dashboard
## Content
# Katalog KPI, raportów i projekt dashboardu zarządczego BI dla MŚP w oparciu o Comarch ERP Optima

## TL;DR
- **Najważniejsze ustalenie:** masz solidną, uniwersalną i dobrze udokumentowaną warstwę metodologiczną (~40 wskaźników w 8 obszarach z wzorami, sensem biznesowym, wizualizacją i progiem alertu) — ale **większość zaawansowanych KPI (ABC/XYZ, RFM, HHI, CCC, EBITDA) musisz policzyć samodzielnie na bazie CDN**, bo Comarch nie udostępnia ich jako gotowych funkcji.
- Comarch ERP Optima daje standardowo moduł **„Analizy BI"** (raporty drag&drop, m.in. 7.19 Ranking produktów zalegających, 7.20 Zaleganie w przedziałach, 1.26/1.27 Analiza RO, 1.30 Faktury nierozliczone) oraz osobno płatny **Comarch BI Point** (oficjalnie 197 raportów + 9 dashboardów, OLAP, kokpity menadżerskie).
- Rekomendowana architektura: **piramida 3 poziomów** (zarząd: 7-9 KPI → kierownicy: warstwa taktyczna → drill-down do dokumentu), z wizualizacjami dobranymi do typu danych (waterfall dla wyniku, bullet chart dla plan/wykonanie, heatmapa dla aging, sparkline dla trendów).

## Key Findings

1. **Metodologia KPI jest uniwersalna i stabilna.** Wzory dla DSO/DPO/DIO/CCC, marż, rotacji zapasów, ABC/XYZ, RFM, HHI są zgodne między źródłami klasy Corporate Finance Institute (CFI), Wall Street Prep, Wikipedia oraz polską literaturą controllingową/logistyczną (Politechnika Łódzka, Encyklopedia Zarządzania mfiles.pl).
2. **Jedna istotna niejednoznaczność definicyjna — ROS.** Wall Street Prep i CFI definiują Return on Sales jako marżę operacyjną opartą na EBIT, podczas gdy angielska Wikipedia (hasło „Operating margin") równolegle podaje definicję opartą na zysku netto („Net profit as a percentage of sales revenue"). Należy to zdefiniować jawnie w słowniku metryk — w katalogu przyjmujemy wariant EBIT.
3. **Comarch ma dwa różne narzędzia o mylących nazwach:** starszy moduł „Analizy" (raporty kontekstowe z list — zawiera wskaźnik rotacji magazynowej i strukturę wiekową należności/zobowiązań) oraz „Analizy BI" (narzędzie BI z tabelą przestawną). To rozróżnienie jest krytyczne przy mapowaniu.
4. **Analiza ABC nie jest nazwaną funkcją w zweryfikowanej dokumentacji Comarch** — istnieją funkcje pokrewne (TOP N, ranking produktów), ale samą klasyfikację ABC/XYZ trzeba zbudować samodzielnie.
5. **Progi alertów są branżowo zależne** — wartości w katalogu to punkty startowe do kalibracji na danych historycznych firmy (zalecane min. 12 miesięcy).

## Details

### A. OBSZAR: FINANSE I RENTOWNOŚĆ

**Marża brutto (Gross Margin)**
- Definicja: zysk po odjęciu kosztu własnego sprzedaży (COGS) jako % przychodu.
- Wzór: (Przychód − COGS) / Przychód × 100%.
- Sens: podstawowa efektywność cenowo-kosztowa; ile zostaje na pokrycie kosztów operacyjnych.
- Źródło danych CDN: TraNag/TraElem (wartość sprzedaży i koszt), Towary, Kategorie.
- Wizualizacja: KPI card ze sparkline + waterfall przychód→COGS→marża.
- Próg alertu: spadek marży poniżej budżetu lub spadek o ≥2-3 pkt proc. MoM.

**Marża netto / rentowność sprzedaży netto**
- Wzór: Zysk netto / Przychód × 100%.
- Sens: ostateczna rentowność po wszystkich kosztach, podatkach i pozycjach nieoperacyjnych.

**Return on Sales (ROS) / marża operacyjna**
- Definicja: zysk operacyjny (EBIT) / przychód netto. Przyjmujemy definicję opartą na EBIT, zgodnie z Wall Street Prep („The return on sales ratio (ROS), also known as the 'operating margin,' measures the amount of operating income generated per dollar of sales... EBIT") i CFI. **Uwaga:** angielska Wikipedia podaje równolegle sprzeczną definicję opartą na zysku netto — dlatego definicja musi być jawnie ustalona w słowniku metryk firmy.
- Wzór: EBIT / Sprzedaż netto × 100%.
- Wizualizacja: bullet chart (wykonanie vs cel).

**EBITDA (uproszczona z ERP)**
- Wzór: Zysk netto + Odsetki + Podatki + Amortyzacja (= EBIT + Amortyzacja).
- Sens: przybliżenie operacyjnego cash flow — wg Wikipedii „a rough way of calculating how much cash the business is generating and is even sometimes called the 'operating cash flow'", ponieważ usuwa wpływ polityki amortyzacji i finansowania.
- Ograniczenia: EBITDA nie jest miarą GAAP, ignoruje zmiany kapitału obrotowego i nakłady CAPEX (Warren Buffett krytykuje jej użycie jako miary wyceny).
- Źródło CDN: DekretyNag/DekretyElem, Konta, Obroty (zespoły kont 4/7).

**Wynik finansowy, dynamika MoM/YoY, narastanie YTD**
- MoM: (wartość bieżąca − poprzedni miesiąc) / poprzedni miesiąc × 100%.
- YoY: porównanie do analogicznego okresu rok wcześniej (eliminuje sezonowość).
- YTD: suma narastająca od początku roku.
- Wizualizacja: wykres narastający YTD + tabela z kolumnami MoM/YoY; sparkline na KPI card.

**Analiza odchyleń / budżet vs wykonanie**
- Wzór: Odchylenie = Wykonanie − Budżet; klasyfikacja korzystne (favorable) vs niekorzystne (unfavorable).
- Best practice (Wall Street Prep, FloQast): oznaczać odchylenia powyżej progu (typowo 10%) formatowaniem warunkowym; opisywać jako „korzystne/niekorzystne" względem wyniku, nie „wyższy/niższy" (np. koszt wyższy od planu = odchylenie niekorzystne dla zysku).
- Typy odchyleń: przychodowe, kosztowe, wolumenowe, cenowe, struktury sprzedaży (sales mix).
- Wizualizacja: tabela odchyleń z F/U + waterfall (bridge) plan→wykonanie.

**Cash flow operacyjny (metoda pośrednia)**
- Wzór (zgodnie z KSR nr 1): Zysk netto + amortyzacja ± zmiany kapitału obrotowego (Δ należności, Δ zobowiązania, Δ zapasy) ± korekty (różnice kursowe, odsetki, wynik z działalności inwestycyjnej).
- Sens: dodatnie saldo operacyjne to warunek przetrwania; jak wskazuje mksiegowa.pl, jednostki długotrwale niegenerujące dodatniego salda operacyjnego zazwyczaj bankrutują.
- Źródło CDN: DekretyNag, KsiRozrachunki, BnkZapisy.

### B. OBSZAR: PŁYNNOŚĆ I KAPITAŁ OBROTOWY

**DSO (Days Sales Outstanding)**
- Wzór: (Średnie należności / Sprzedaż na kredyt) × liczba dni okresu.
- Sens: średni czas inkasa należności; niższy = szybszy spływ gotówki.
- Źródło CDN: KsiRozrachunki, TraNag.

**DPO (Days Payable Outstanding)**
- Wzór: (Średnie zobowiązania / COGS) × liczba dni.
- Sens: średni czas spłaty dostawców; wyższy = dłuższe finansowanie dostawcami (w granicach uzgodnionych terminów — zbyt długi DPO psuje relacje).

**DIO (Days Inventory Outstanding) / dni zapasu**
- Wzór: (Średni zapas / COGS) × liczba dni = 365 / rotacja zapasów.

**Cash Conversion Cycle (CCC)**
- Wzór: CCC = DIO + DSO − DPO (zgodnie z CFI i Wall Street Prep). Pierwsza część (DIO + DSO) to cykl operacyjny.
- Sens: liczba dni, przez które gotówka jest zamrożona w cyklu; krótszy lepszy, bywa ujemny (np. Amazon, Costco). Najlepiej oceniać trendem i wobec konkurentów z branży.
- Wizualizacja: waterfall DIO + DSO − DPO = CCC.

**Wskaźnik bieżącej płynności (Current Ratio)**
- Wzór: Aktywa obrotowe / Zobowiązania krótkoterminowe.
- Interpretacja: wartość >1 oznacza pokrycie zobowiązań bieżących. Wg Ramp (autor Ken Boyd, były CPA/KPMG) zdrowy zakres to zwykle 1,5–2,0; branżowo: produkcja 2,0–3,0, technologia 1,5–2,0, utilities ~0,5–1,0, handel detaliczny często ~0,9–1,5 dzięki szybkiej rotacji. Zbyt wysoki wskaźnik = niewykorzystany kapitał.

**Wskaźnik szybkiej płynności (Quick Ratio / acid test)**
- Wzór: (Aktywa obrotowe − Zapasy) / Zobowiązania krótkoterminowe.
- Interpretacja: wartość ≥1 zwykle uznawana za dobrą; bardziej konserwatywna niż current ratio, bo wyklucza zapasy (mniej płynne).

### C. OBSZAR: NALEŻNOŚCI I ZOBOWIĄZANIA (AGING)

**Struktura wiekowa należności (AR aging)**
- Przedziały standardowe: bieżące (niewymagalne), 1-30, 31-60, 61-90, >90 dni po terminie (część firm dodaje 91-120 i 120+).
- Best practice (NetSuite, Stripe, Ledgerup): liczyć od daty wymagalności (due date), nie od daty wystawienia; przeglądać tygodniowo (min. miesięcznie przy zamknięciu). Sygnał ostrzegawczy: gdy >20-25% AR jest po terminie.
- Sens: prawdopodobieństwo ściągnięcia spada z wiekiem długu (wg danych Commercial Collection Agency Association ~73% po 90 dniach, <50% po 6 miesiącach).
- Punkt odniesienia (źródła SaaS): zdrowo gdy 60-70% AR w przedziale 0-30 dni, <10% w 61-90, <5% w 90+.
- Wizualizacja: heatmapa (klient × przedział) + skumulowany wykres słupkowy.
- Próg alertu: rosnący udział w przedziałach >60/>90 dni, lub pojedynczy klient >15-20% całości AR.
- Źródło CDN: KsiRozrachunki (terminy płatności), Kontrahenci.

**Struktura wiekowa zobowiązań (AP aging)** — analogicznie, do zarządzania terminami płatności i optymalizacji DPO.

**Prognoza wpływów i wydatków** — kalendarz płatności na bazie terminów z KsiRozrachunki/BnkZdarzenia; zestawienie największych dłużników i wierzycieli.

### D. OBSZAR: MAGAZYN

**Rotacja zapasów (Inventory Turnover)**
- Wzór: COGS / Średni zapas (niektórzy używają sprzedaży w liczniku — kluczowa jest konsekwencja).
- Sens: ile razy zapas „obrócił się" w okresie; wyższy = sprawniejsza sprzedaż, mniej zamrożonego kapitału. Wiele branż uznaje 5-10 za zdrowy poziom, ale zależy to silnie od sektora.
- Powiązanie: DIO = 365 / rotacja.
- Źródło CDN: TwrZasoby, TraElem, RemanentNag.

**Analiza ABC**
- Metodologia (mfiles.pl, Politechnika Łódzka): sortowanie pozycji wg malejącej wartości kryterium (obrót, marża lub wartość zużycia), wyznaczenie grup wg podziału 80/15/5 wartości skumulowanej. Grupa A ≈ 5-20% pozycji = ~75-80% wartości; B ≈ 15-30% = 15-20%; C ≈ 50-80% pozycji = ~5% wartości. Oparta na zasadzie Pareto (reguła 80/20).
- Strategie: grupa A → ścisła kontrola, just-in-time, dokładne zapasy bezpieczeństwa; grupa C → liberalniejsze zasady zamawiania.
- Wizualizacja: krzywa Pareto/Lorenza.

**Analiza XYZ**
- Metodologia: klasyfikacja wg zmienności popytu (współczynnik zmienności = odchylenie standardowe / średnia). X = stabilny, regularny popyt; Y = sezonowy/średnia zmienność; Z = nieregularny, trudny do prognozowania.
- **Macierz ABC/XYZ**: 9 grup; AX = strategiczne (kandydaci do automatyzacji i just-in-time), CZ = niska wartość + nieregularność (kandydaci do wycofania z oferty).

**Zapasy martwe (dead stock) i wolnorotujące** — niska/zerowa rotacja; identyfikacja przez raporty zalegania (w Optimie: 7.19 Ranking produktów zalegających, 7.20 Zaleganie w przedziałach).

**Wartość zamrożonego kapitału** — suma wartości zapasów wolnorotujących i martwych; bezpośredni wpływ na cash flow i koszty magazynowania.

**Stockout risk** — ryzyko braku dostępności; równoważenie z nadmiarem zapasu (zbyt wysoka rotacja może sygnalizować niedobory i utracone sprzedaże).

### E. OBSZAR: SPRZEDAŻ I KONTRAHENCI

**Analiza Pareto 80/20** — typowo 20% klientów/produktów generuje ~80% sprzedaży lub marży; podstawa priorytetyzacji.

**Koncentracja sprzedaży / HHI (Herfindahl-Hirschman)**
- Wzór: HHI = Σ(udział_i)², gdzie udziały wyrażone w % (zakres 0-10 000) lub ułamkach (0-1).
- Sens: miara ryzyka koncentracji portfela klientów (CFI, Umbrex potwierdzają zastosowanie do bazy klientów, nie tylko rynku). Progi (antymonopolowe DOJ/FTC, stosowalne pomocniczo): <1 500 niska koncentracja, 1 500-2 500 umiarkowana, >2 500 wysoka.
- Uzupełnienie praktyczne: udział TOP 5 / TOP 10 klientów w przychodzie.

**Segmentacja RFM (Recency, Frequency, Monetary)**
- Metodologia: dla każdego klienta liczymy 3 wartości (dni od ostatniego zakupu; liczba transakcji; suma wydatków), dzielimy bazę na **kwintyle (score 1-5)** dla każdego wymiaru; kod RFM np. 545. Model opracowany przez Hughesa (1994), wywodzi się z marketingu bazodanowego.
- Predykcyjność: **Recency ma najwyższą siłę predykcyjną**, następnie Frequency, najmniej Monetary (potwierdzone literaturą — Hughes, badania cytowane w pracy arXiv 2009.03661). Recalkulacja co najmniej miesięcznie.
- Wizualizacja: heatmapa segmentów R×F; segmenty typu Champions (545), At-Risk, Lost.

**Churn / retencja klientów**
- Churn rate = klienci utraceni w okresie / klienci na początku okresu × 100%.
- Retention rate = (klienci na końcu − nowi pozyskani) / klienci na początku × 100% = 100% − churn.
- W B2B mierzyć na poziomie konta i wartości (jeden duży klient ≠ jeden mały); średni churn B2B wg CustomerGauge ~23%/rok, różni się mocno wg branży.
- Nowi vs powracający vs utraceni klienci; cross-sell/up-sell; analiza koszykowa (które produkty kupowane razem).

### F. DASHBOARDY ZARZĄDCZE — DOBRE PRAKTYKI

- **Liczba KPI**: 5-7 (max 9) głównych wskaźników na widok (zgodnie z ThoughtSpot, Tabular Editor, Klipfolio); reszta przez drill-down. „Ściana liczb" przeciąża pamięć roboczą.
- **Piramida KPI / typy dashboardów** (Tableau, Qlik, UXPin):
  - **Strategiczny** (zarząd/zarząd, miesięcznie/kwartalnie) — wynik, marże, cash flow, długoterminowe cele.
  - **Taktyczny** (kierownicy, tygodniowo) — postęp wobec celów, blokery, właściciele.
  - **Operacyjny / analityczny** (codziennie, drill-down do dokumentu).
- **Dobór wizualizacji do typu danych**:
  - **Waterfall / bridge** — dekompozycja wyniku, plan vs wykonanie, mostek przychód→zysk, CCC, ARR bridge (spopularyzowany przez McKinsey).
  - **Bullet chart** — wykonanie vs cel z zakresami, kompaktowo (idealny dla dashboardów zarządu).
  - **Heatmapa** — wzorce w dużych zbiorach (aging klient×przedział, sprzedaż region×czas).
  - **Sparkline** — mikrotrend obok liczby na KPI card.
  - **Wykres narastający** — YTD.
  - **Tabela odchyleń** — budżet vs wykonanie z formatowaniem warunkowym (strzałki/kolory).
- **Reguła 3-30-300** (Kurt Buhler): KPI czytelne w 3 sekundy, kontekst w 30, szczegół w 300.
- **Kolor jako sygnał** (traffic lights: czerwony/żółty/zielony), nie dekoracja. KPI bez kontekstu (cel/trend/baseline) to „tylko liczba".
- **Layout**: KPI w „hot zone" (góra/lewo), filtry widoczne, spójne rozmiary kafelków, unikać wykresów kołowych.
- **Alerty KPI**: progi powiązane z celami; subskrypcje mailowe warunkowe (np. wyzwalane przekroczeniem limitu należności lub spadkiem marży).

### G. SPECYFIKA COMARCH ERP OPTIMA / ANALIZY BI

**Moduł „Analizy BI" (wbudowany, desktopowy):**
- Narzędzie klasy BI z tabelą przestawną; raporty metodą drag&drop na bazie zapytań SQL; subskrypcje mailowe/SMS (harmonogramy, subskrypcje warunkowe); eksport do Excela; funkcje agregacji (suma, średnia, licznik, min/max), TOP N, formatowanie warunkowe. Dwa warianty licencji: standard (2 jednoczesnych użytkowników, 1 baza) i nieograniczony/Plus (wiele baz).
- **Obszary raportów standardowych** (oficjalny podręcznik Comarch): Sprzedaż, Zakupy, Płatności, Księgowość, Rejestry VAT, Kadry i Płace, Magazyny, Serwis, Środki Trwałe, CRM, Rozrachunki Księgowe.
- **Konkretne nazwane raporty** (oficjalna Baza Wiedzy pomoc.comarch.pl):
  - Handel/Sprzedaż: **1.26 Analiza RO według kontrahentów**, **1.27 Analiza RO pozostałych do realizacji**, **1.30 Faktury nierozliczone**, **23 Raport Sprzedaży z Opisem Analitycznym**, 24 Raport Zakupów z Opisem Analitycznym.
  - Magazyn: **7.19 Ranking produktów zalegających**, **7.20 Zaleganie w przedziałach**, **7.23 Zaleganie w przedziałach na dzień**, **7.18 Produkty z dostaw**, **14 Raport Zasobów Magazynowych z Dostaw**, 7.24 Raport Dokumentów Magazynowych z Cechami Dostaw.
  - Księgowość: **5.09 Ewidencja dodatkowa przychodów i kosztów**, **25 Raport Księgowości (KK) z Opisem Analitycznym**, **08 Raport Rejestrów VAT** (z wymiarem „Odliczenia" dla deklaracji VAT-7).
  - CRM: **10.06 Liczba ankiet**, **10.07 Poziom wypełnienia ankiet**, 10.08 Pytania/odpowiedzi.
  - Płace i Kadry: 6.23 Delegacje zagraniczne – czas w delegacji.
- **Miary (oficjalne)**: Kwota, Kwota waluta, Wymiar Procent, Wymiar Wartość, Suma Elementów Wypłaty, Czas Trwania Czynności (godziny/minuty). **Wymiary**: Kontrahent, Odliczenia, Daty Wystawienia, Data Terminu Rezerwacji, Baza Firmowa.
- **Liczba raportów**: Comarch oficjalnie używa określenia **„setki"** / „szereg standardowych raportów"; partnerzy podają rozbieżne liczby (50/100/147/150) — prawdopodobnie dane z różnych okresów rozwoju modułu. Jedyna dokładna oficjalna liczba (197 raportów + 9 dashboardów) dotyczy BI Point, nie wbudowanego modułu.

**Comarch BI Point (osobny produkt, płatny):**
- Aplikacja serwerowa niezależna od wydań Optimy; dostęp przez przeglądarkę (desktop + mobile, responsywny); dashboardy/kokpity menadżerskie; kostki OLAP z drilldown („od ogółu do szczegółu"); wieloźródłowość (Excel/CSV + MSSQL/Oracle/PostgreSQL); asystent AI ChatERP; subskrypcje/powiadomienia/alerty; uprawnienia wg ról.
- **Oficjalnie (comarch.pl): 197 standardowych raportów + 9 dashboardów**, w 5 obszarach: Handel, Logistyka, Płatności, Płace i Kadry, Księgowość (Dokumentacja Użytkownika Comarch BI Point, wersja 8.5).
- Funkcja **alertów przy przekroczeniu progów KPI** jest najmocniej opisana w materiałach partnerskich (np. wgkom.pl: alert „gdy należności przeterminowane przekroczą X zł, marża spadnie poniżej Y%"); oficjalny opis Comarch akcentuje subskrypcje i powiadomienia.

**Wnioski dla budowy własnego panelu:**
- **Rotacja magazynowa i struktura wiekowa należności/zobowiązań** są opisane w dokumentacji **starszego modułu „Analizy"** (raporty kontekstowe z list, „wskaźnik magazynowy = iloraz sprzedaży do średniej wartości magazynu"), a nie w „Analizy BI" — przy mapowaniu nie mylić tych modułów.
- **Analiza ABC, RFM, HHI, CCC, EBITDA nie są gotowymi funkcjami** — należy je policzyć samodzielnie na bazie CDN (rekomendacja: widoki SQL + Power BI/Tableau/Qlik na replice bazy, lub własne raporty w Analizy BI).

## Recommendations

**Faza 1 — fundament (2-4 tygodnie):** Zbuduj warstwę pośrednią (widoki SQL / model danych w Power BI) na **replice** bazy CDN (nie na produkcyjnej). Zacznij od 7-9 KPI zarządczych: przychód YTD + YoY, marża brutto, wynik/EBITDA, cash flow operacyjny, DSO, CCC, aging należności >60 dni, rotacja zapasów. *Benchmark przejścia dalej:* gdy te KPI są stabilne i uzgodnione z księgowością (różnice <1-2%).

**Faza 2 — warstwa operacyjna:** Dodaj ABC/XYZ zapasów (na TwrZasoby/TraElem), segmentację RFM (na TraNag/Kontrahenci), koncentrację HHI + TOP klientów, budżet vs wykonanie z waterfallem. *Kluczowe:* **skalibruj progi alertów na danych historycznych z 12 miesięcy**, a nie na wartościach książkowych — np. próg DSO ustaw jako średnia + 1 odchylenie standardowe z ostatniego roku.

**Faza 3 — automatyzacja i dystrybucja:** Wdroż alerty KPI + subskrypcje mailowe (natywnie w Analizy BI/BI Point lub przez Power BI) oraz drill-down do poziomu dokumentu (DokNag/DokElem, TraNag).

**Decyzja narzędziowa (próg):**
- Jeśli wystarczą raporty tabelaryczne i eksport do Excela → **wbudowane Analizy BI** (zerowy dodatkowy koszt licencyjny).
- Jeśli zarząd potrzebuje interaktywnych dashboardów, OLAP, alertów progowych i dostępu mobilnego → **Comarch BI Point** (natywna integracja) albo **zewnętrzny Power BI/Tableau/Qlik na replice CDN** (większa elastyczność modelowania ABC/RFM/HHI, niższy koszt przy posiadanej licencji Microsoft 365).

**Słownik metryk:** Ujednolić jawnie definicję ROS (rekomendacja: EBIT-based), COGS oraz „sprzedaży na kredyt" w jednym dokumencie, aby uniknąć rozbieżności między działami i między dashboardami.

## Caveats
- **Progi alertów i benchmarki są branżowo zależne** — wszystkie wartości liczbowe w katalogu (current ratio 1,5-2,0; aging 60-70% w 0-30 dni; HHI >2 500; rotacja 5-10) traktować jako punkt startowy do kalibracji.
- **Definicja ROS jest sprzeczna w źródłach** (EBIT vs zysk netto); EBITDA nie jest miarą GAAP i pomija kapitał obrotowy oraz CAPEX.
- **Dokładna liczba raportów Analizy BI nie jest oficjalnie potwierdzona** przez Comarch (rozbieżne dane partnerów: 50/100/147/150); liczba 197+9 dotyczy wyłącznie BI Point.
- **Termin „analiza ABC" nie występuje w zweryfikowanej dokumentacji Comarch** — funkcja do zbudowania samodzielnie.
- **Część metodologii RFM/churn/aging pochodzi ze źródeł SaaS/e-commerce** (Stripe, NetSuite, CustomerGauge); w B2B/handlu zaleca się analizę na poziomie konta i wartości, nie liczby klientów. Niektóre punkty odniesienia agingu pochodzą od dostawców (banki danych jak Dun & Bradstreet są lepszym źródłem benchmarków branżowych).
- **Część cytatów partnerów Comarch miesza moduły „Analizy" i „Analizy BI"** — przy wdrożeniu weryfikować na konkretnej, posiadanej wersji Optimy.