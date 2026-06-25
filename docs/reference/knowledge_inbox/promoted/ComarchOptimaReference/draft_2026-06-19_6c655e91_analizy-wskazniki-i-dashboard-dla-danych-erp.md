# Analizy, wskaźniki i dashboard dla danych ERP
- draftId: `draft_2026-06-19_6c655e91_analizy-wskazniki-i-dashboard-dla-danych-erp`
- kbNamespace: `ComarchOptimaReference`
- status: `promoted`
- promotedAt: `2026-06-19T12:32:45.686Z`
- tags: `analizy ERP`, `wskaźniki KPI`, `dashboard`, `BI`, `controlling`, `ERP reference`, `raportowanie`
- reviewNote: Bulk approved 2 drafts from dashboard
## Content
# Baza Wiedzy: Analizy, Wskaźniki i Dashboard dla danych ERP

> Wersja: 1.0  
> Dokument źródłowy do projektu BI/Controlling na bazie danych ERP  
> Charakter dokumentu: katalog referencyjny — nie analizuje rzeczywistych danych

---

## 1. Cel raportu

Niniejszy dokument to **baza wiedzy (knowledge base)** poprzedzająca właściwą analizę danych ERP. Jego rolą jest dostarczyć usystematyzowany katalog tego, co **w ogóle warto** mierzyć, raportować i wizualizować w firmie korzystającej z ERP — zanim sięgniemy do pierwszej tabeli źródłowej.

W praktyce dokument realizuje trzy zadania:

1. **Wytycza granice merytoryczne projektu BI** — od KPI strategicznych dla zarządu, przez controlling i sprzedaż, aż po wskaźniki magazynowe i operacyjne, wraz z konkretnymi wzorami, źródłami danych w ERP i sugerowanymi wizualizacjami.
2. **Racjonalizuje kolejność wdrożenia** — rozdziela to, co da się uruchomić w tydzień (sprzedaż dzienna, top kontrahenci, aging należności), od tego, co wymaga modelu danych (rentowność klientów, budżet vs wykonanie), i od warstwy zaawansowanej (prognozy, wykrywanie anomalii).
3. **Wskazuje dane wymagane z ERP** oraz typowe problemy z ich jakością, aby zminimalizować ryzyko, że dashboard liczy źle, bo źle czyta źródło.

Każde istotne twierdzenie poparte jest źródłem zewnętrznym ([NetSuite](https://www.netsuite.com/portal/resource/articles/accounting/financial-kpis-metrics.shtml), [Oracle](https://www.oracle.com/erp/cfo/cfo-kpis/), [Sievo](https://sievo.com/blog/procurement-kpis), [ABC Supply Chain](https://abcsupplychain.com/abc-xyz-analysis/), [Microsoft Learn](https://learn.microsoft.com/en-us/power-bi/guidance/star-schema), [Investopedia](https://www.investopedia.com/terms/d/dso.asp)). Tam, gdzie definicje różnią się między źródłami (klasyczny przypadek DSO, LTV, EBITDA), pokazano warianty.

---

## 2. Mapa obszarów analitycznych ERP

| Obszar | Cel biznesowy | Przykładowe pytania zarządcze | Typowe źródła danych w ERP | Priorytet |
|---|---|---|---|---|
| **Zarząd / Executive** | Ogólny obraz kondycji firmy, wczesne ostrzeganie | Czy firma rośnie? Czy mamy płynność? Gdzie palą się alarmy? | Agregaty ze wszystkich modułów | **Wysoki** |
| **Sprzedaż** | Maksymalizacja przychodu i marży | Co się sprzedaje, komu, kiedy, z jaką marżą? | Faktury sprzedaży, zamówienia, pozycje, cenniki | **Wysoki** |
| **Finanse i controlling** | Kontrola wyniku, kosztów, budżetu | Czy realizujemy budżet? Jaka jest rentowność? | Księga główna, koszty, przychody, plan budżetowy | **Wysoki** |
| **Należności i zobowiązania** | Płynność i ryzyko płatnicze | Kto zalega? Ile dni czekamy na pieniądze? | Rozrachunki, faktury, płatności, wyciągi bankowe | **Wysoki** |
| **Magazyn i zapasy** | Optymalizacja kapitału obrotowego, dostępność | Co zalega? Czego brakuje? Ile mamy zamrożone? | Stany magazynowe, ruchy MM/PZ/WZ, kartoteki towarowe | **Wysoki** |
| **Zakupy** | Kontrola kosztów zakupu, niezawodność dostaw | Czy płacimy dobrze? Czy dostawcy są terminowi? | Faktury zakupu, ZK, dostawcy, ceny historyczne | **Średni** |
| **Kontrahenci / CRM** | Retencja, segmentacja, koncentracja przychodu | Kto jest naszym klientem? Czy nie odchodzi? | Kartoteki, historia transakcji, daty pierwszej/ostatniej sprzedaży | **Średni** |
| **Operacje / procesy** | Wydajność i jakość procesów | Ile trwa cykl zamówienia? Ile mamy błędów w danych? | Dokumenty z timestampami, powiązania dokumentów | **Średni** |
| **Kadry i płace** | Koszt pracy, produktywność | Jaki przychód na pracownika? Jak duża rotacja? | Lista płac, ewidencja czasu, kartoteki kadrowe | **Niski** (jeśli dostępne) |
| **Predykcja i alerty** | Wczesne ostrzeganie, prognozy | Czy zabraknie towaru? Czy spadnie marża? | Wszystkie powyższe + szeregi czasowe | **Niski → Wysoki** (etap 3) |

> **[NEEDS INPUT]** Priorytety zakładają firmę handlowo-usługową. Dla produkcji wzrasta waga magazynu i operacji (OEE), dla SaaS — CRM, retencji i churn.

---

## 3. Katalog KPI i wskaźników

Poniżej **ponad 90 wskaźników**, pogrupowanych tematycznie. Tam, gdzie definicje rozjeżdżają się między źródłami, pokazane są warianty.

### 3.1 Rentowność i wynik

| Nazwa KPI | Co mierzy | Wzór | Wymagane dane | Częstotliwość | Wizualizacja | Interpretacja | Ryzyka | Priorytet | Źródła |
|---|---|---|---|---|---|---|---|---|---|
| **Marża brutto (Gross Profit Margin)** | Udział zysku brutto w przychodach | (Sprzedaż netto − KWS) / Sprzedaż netto × 100% | Faktury sprzedaży, KWS | Dzienna/Miesięczna | KPI card + linia | Polityka cenowa i zakupowa | KWS musi obejmować WSZYSTKIE koszty bezpośrednie | Wysoki | [NetSuite](https://www.netsuite.com/portal/resource/articles/accounting/financial-kpis-metrics.shtml) |
| **Marża netto (Net Profit Margin)** | Udział zysku netto w przychodach | (Zysk netto / Przychody) × 100% | RZiS | Miesięczna | KPI card + trend | Pełna efektywność biznesu | Wpływ zdarzeń jednorazowych | Wysoki | [NetSuite](https://www.netsuite.com/portal/resource/articles/accounting/financial-kpis-metrics.shtml) |
| **ROS (Return on Sales)** | Zwrot ze sprzedaży | (EBIT / Przychody) × 100% | RZiS | Miesięczna | KPI card | Operacyjna rentowność sprzedaży | Mylony z marżą netto | Wysoki | [PragmaGO](https://pragmago.pl/porada/analiza-rentownosci-i-wskazniki-rentownosci/) |
| **EBITDA / EBITDA Margin** | Operacyjna rentowność bez finansowania/amortyzacji | EBITDA = Zysk netto + Odsetki + Podatki + Amortyzacja; Margin = EBITDA / Przychody | RZiS + amortyzacja | Miesięczna/Kwartalna | KPI card + benchmark | Porównywalność między firmami | Pomija realne wydatki kapitałowe | Wysoki | [Investopedia](https://www.investopedia.com/terms/e/ebitda-margin.asp), [Oracle](https://www.oracle.com/erp/cfo/cfo-kpis/) |
| **ROA (Return on Assets)** | Efektywność wykorzystania aktywów | Zysk netto / Średnie aktywa ogółem | Bilans + RZiS | Kwartalna | KPI card | Im wyżej, tym efektywniej | Wpływ wyceny aktywów | Średni | [Oracle](https://www.oracle.com/erp/cfo/cfo-kpis/), [BiznesRadar](https://www.biznesradar.pl/slownik-wskazniki/rentownosci) |
| **ROE (Return on Equity)** | Zwrot z kapitału własnego | Zysk netto / Kapitał własny | Bilans + RZiS | Kwartalna | KPI card | Korzyść dla właścicieli | Może rosnąć przez dług, nie efektywność | Średni | [Cogit.pl](https://www.cogit.pl/o-firmie/aktualnosci/analiza-rentownosci-jak-sprawdzic-wskazniki-rentownosci-przedsiebiorstwa/) |
| **Marża kontrybucji (Contribution Margin)** | Przychód minus koszty zmienne | Przychody − Koszty zmienne; CM% = CM / Przychody | Sprzedaż + klasyfikacja kosztów na stałe/zmienne | Miesięczna | Waterfall, słupkowy | Punkt rentowności, break-even | Wymaga poprawnej klasyfikacji kosztów | Średni | [Investopedia](https://www.investopedia.com/terms/c/contributionmargin.asp) |
| **SG&A ratio** | Udział kosztów sprzedaży, ogólnych, admin. | (S+G+A) / Sprzedaż netto | Plan kont kosztowy | Miesięczna | Linia w czasie | Kontrola kosztów stałych | Granica między S, G a A zależna od polityki rachunkowości | Średni | [NetSuite](https://www.netsuite.com/portal/resource/articles/accounting/financial-kpis-metrics.shtml) |
| **EPS (Earnings per Share)** | Zysk na akcję | Zysk netto / Średnia ważona liczba akcji | RZiS + rejestr akcjonariuszy | Kwartalna/Roczna | KPI card | Dla spółek z udziałowcami | Nieadekwatne dla firm prywatnych | Niski | [NetSuite](https://www.netsuite.com/portal/resource/articles/accounting/financial-kpis-metrics.shtml) |

### 3.2 Płynność i kapitał obrotowy

| KPI | Co mierzy | Wzór | Dane | Częstotliwość | Wizualizacja | Interpretacja | Ryzyka | Priorytet | Źródła |
|---|---|---|---|---|---|---|---|---|---|
| **Current Ratio (płynność bieżąca)** | Krótkookresowa wypłacalność | Aktywa obrotowe / Zobowiązania bieżące | Bilans | Miesięczna | Gauge | Norma 1,5–2,0 | Zapasy mogą być trudne do upłynnienia | Wysoki | [Investopedia](https://www.investopedia.com/terms/c/currentratio.asp) |
| **Quick Ratio (acid test)** | Płynność bez zapasów | (Aktywa obrotowe − Zapasy) / Zobowiązania bieżące | Bilans | Miesięczna | Gauge | Norma ≥ 1,0 | Inkluduje należności, które mogą być zagrożone | Wysoki | [NetSuite](https://www.netsuite.com/portal/resource/articles/financial-management/quick-ratio.shtml) |
| **Cash Ratio** | Płynność gotówkowa | Gotówka / Zobowiązania bieżące | Bilans, stan kasy/banku | Tygodniowa | KPI card | Zachowawczy benchmark | Zbyt wysoki = bezczynna gotówka | Średni | [HBS Online](https://online.hbs.edu/blog/post/liquidity-ratios) |
| **Working Capital** | Kapitał obrotowy | Aktywa obrotowe − Zobowiązania bieżące | Bilans | Miesięczna | KPI card + trend | Bufor bezpieczeństwa | Wartość bezwzględna, trudna do porównań | Wysoki | [Oracle](https://www.oracle.com/erp/cfo/cfo-kpis/) |
| **Operating Cash Flow Ratio** | Pokrycie zobowiązań z operacji | Operacyjny CF / Zobowiązania bieżące | Cash Flow + bilans | Kwartalna | KPI card | ≥ 1 = pokrycie z bieżącej działalności | Wymaga rachunku CF | Wysoki | [NetSuite](https://www.netsuite.com/portal/resource/articles/accounting/financial-kpis-metrics.shtml) |
| **Cash Runway** | Ile miesięcy przeżyje firma na obecnej gotówce | Saldo gotówki / Miesięczny burn | Wyciągi + RZiS | Miesięczna | KPI card | Krytyczne dla startupów | Zakłada stały burn | Średni | [Oracle](https://www.oracle.com/erp/cfo/cfo-kpis/) |
| **Cash Conversion Cycle (CCC)** | Cykl konwersji gotówki | DIO + DSO − DPO | Magazyn + należności + zobowiązania | Miesięczna | Waterfall | Im krótszy, tym lepiej | Składa się z 3 osobnych KPI | Wysoki | [Oracle](https://www.oracle.com/erp/cfo/cfo-kpis/) |
| **Debt-to-Equity** | Stosunek długu do kapitału | Zobowiązania ogółem / Kapitał własny | Bilans | Kwartalna | KPI card | Struktura finansowania | Wysokie zadłużenie = ryzyko | Średni | [NetSuite](https://www.netsuite.com/portal/resource/articles/accounting/financial-kpis-metrics.shtml) |
| **Interest Coverage** | Pokrycie odsetek | EBIT / Koszty odsetkowe | RZiS | Kwartalna | KPI card | ≥ 3 = bezpieczne | Wrażliwe na zmienność EBIT | Średni | [NetSuite](https://www.netsuite.com/portal/resource/articles/accounting/financial-kpis-metrics.shtml) |

### 3.3 Sprzedaż

| KPI | Co mierzy | Wzór | Dane | Częstotliwość | Wizualizacja | Interpretacja | Ryzyka | Priorytet | Źródła |
|---|---|---|---|---|---|---|---|---|---|
| **Przychody netto** | Suma sprzedaży w okresie | Σ wartość netto faktur sprzedaży | Faktury sprzedaży | Dzienna | Linia + KPI card | Podstawowy miernik | Korekty, faktury zaliczkowe | Wysoki | [NetSuite](https://www.netsuite.com/portal/resource/articles/accounting/financial-kpis-metrics.shtml) |
| **Sales Growth Rate** | Dynamika sprzedaży | (Przychody bieżące − poprzednie) / poprzednie × 100% | Faktury | Miesięczna/Roczna | Linia + YoY | Trend wzrostu | Sezonowość zafałszowuje MoM | Wysoki | [NetSuite](https://www.netsuite.com/portal/resource/articles/accounting/financial-kpis-metrics.shtml) |
| **CAGR** | Średnioroczne tempo wzrostu | (Wartość końcowa / początkowa)^(1/n) − 1 | Sprzedaż historyczna | Roczna | KPI card | Dla okresów wieloletnich | Wygładza wahania | Średni | [Oracle](https://www.oracle.com/erp/cfo/cfo-kpis/) |
| **AOV (Average Order Value)** | Średnia wartość zamówienia | Przychód / Liczba transakcji | Dokumenty sprzedaży | Dzienna | Linia + KPI | Skuteczność cross/upsell | Outliery zafałszowują | Wysoki | [Amplitude](https://amplitude.com/blog/ecommerce-conversion-metrics) |
| **Średni koszyk (Basket Size)** | Średnia liczba pozycji na zamówieniu | Σ pozycji / Liczba zamówień | Pozycje dokumentów | Tygodniowa | Histogram | Pomiar cross-sellu | Różne SKU mogą mieć różną wagę | Średni | [Klipfolio](https://www.klipfolio.com/resources/kpi-examples/ecommerce/average-basket-size) |
| **Conversion Rate** | Skuteczność konwersji | Zamówienia / Wizyty (lub leady) × 100% | Sprzedaż + dane front-end | Tygodniowa | Linia | Wymaga danych spoza ERP | Definicja licznika i mianownika kluczowa | Średni | [SmartInsights](https://www.smartinsights.com/ecommerce/ecommerce-analytics/ecommerce-conversion-rates/) |
| **Marża jednostkowa per SKU** | Zysk na produkcie | Cena sprzedaży − koszt zakupu | Cennik + KWS | Codzienna | Tabela + Pareto | Identyfikacja gwiazd i pasażerów | Koszt zakupu z FIFO/średni? | Wysoki | [NetSuite](https://www.netsuite.com/portal/resource/articles/accounting/financial-kpis-metrics.shtml) |
| **Sprzedaż per handlowiec** | Wkład pracowników | Σ sprzedaży / handlowiec | Faktury + przypisanie operatora | Tygodniowa | Słupkowy + ranking | Motywacja i prowizje | Atrybucja zespołu może zniekształcać | Wysoki | [NetSuite](https://www.netsuite.com/portal/resource/articles/accounting/financial-kpis-metrics.shtml) |
| **Sprzedaż per region** | Geografia przychodów | Σ sprzedaży / region | Faktury + adres kontrahenta | Miesięczna | Mapa choropleth | Identyfikacja rynków | Region wg klienta vs dostawy | Średni | — |
| **Sprzedaż per kanał** | Mix kanałów | Σ sprzedaży / kanał | Klasyfikacja dokumentów | Tygodniowa | Słupkowy skumulowany | Optymalizacja kanałów | Niejednoznaczna definicja kanału | Średni | — |
| **Top N produktów (Pareto 80/20)** | Koncentracja sprzedaży | Skumulowany % sprzedaży | Pozycje sprzedaży | Miesięczna | Pareto | 80% sprzedaży = 20% produktów | Sezonowość | Wysoki | [ASQ](https://asq.org/quality-resources/pareto) |
| **Sprzedaż utracona (Lost Sales)** | Zamówienia odrzucone z braku towaru | Σ pozycji ZK bez realizacji z powodu braku stanu | Zamówienia + ruchy magazynowe | Tygodniowa | Słupkowy | Często niemożliwy do oszacowania bez logu zapytań | Wymaga rejestracji odrzuceń | Średni | [NEEDS VERIFICATION — zależne od konkretnego ERP] |
| **Sezonowość** | Wzorzec sprzedaży w roku | Indeks miesięczny vs średnia roczna | Sprzedaż wieloletnia | Roczna | Heatmapa | Planowanie zapasów | Trendy długoterminowe zaburzają | Wysoki | — |
| **Dynamika MoM / YoY** | Zmiana okres do okresu | Bieżący − poprzedni / poprzedni | Sprzedaż agregowana | Miesięczna | Linia + YoY overlay | Identyfikacja punktów zwrotnych | MoM wrażliwe na liczbę dni roboczych | Wysoki | [NetSuite](https://www.netsuite.com/portal/resource/articles/accounting/financial-kpis-metrics.shtml) |

### 3.4 Należności i zobowiązania

| KPI | Co mierzy | Wzór | Dane | Częstotliwość | Wizualizacja | Interpretacja | Ryzyka | Priorytet | Źródła |
|---|---|---|---|---|---|---|---|---|---|
| **DSO (Days Sales Outstanding)** | Średni czas inkasa należności | (Należności / Sprzedaż kredytowa) × Liczba dni | Rozrachunki + faktury | Miesięczna | KPI + trend | 30–45 dni = norma B2B | Sprzedaż kredytowa ≠ cała sprzedaż | Wysoki | [Investopedia](https://www.investopedia.com/terms/d/dso.asp), [Billtrust](https://www.billtrust.com/resources/blog/how-to-calculate-days-sales-outstanding-on-accounts-receivables) |
| **DPO (Days Payable Outstanding)** | Średni czas spłaty zobowiązań | (Zobowiązania × dni) / KWS | Rozrachunki + faktury zakupu | Miesięczna | KPI + trend | Wyższy = darmowe finansowanie | Zbyt wysoki = ryzyko zerwania relacji | Wysoki | [Cube](https://www.cubesoftware.com/blog/days-payable-outstanding-formula) |
| **DIO (Days Inventory Outstanding)** | Dni zapasu | 365 / Rotacja zapasów | Magazyn + KWS | Miesięczna | KPI + trend | Im niższe, tym lepsze | Mix produktów może zniekształcać | Wysoki | [NetSuite](https://www.netsuite.com/portal/resource/articles/accounting/financial-kpis-metrics.shtml) |
| **AR Turnover** | Rotacja należności | Sprzedaż kredytowa / Średnie należności | Rozrachunki | Miesięczna | Linia | Częstotliwość ściągania | Patrz DSO | Wysoki | [Oracle](https://www.oracle.com/erp/cfo/cfo-kpis/) |
| **AP Turnover** | Rotacja zobowiązań | Zakupy kredytowe / Średnie zobowiązania | Rozrachunki + zakupy | Miesięczna | Linia | Częstotliwość regulowania | — | Średni | [Oracle](https://www.oracle.com/erp/cfo/cfo-kpis/) |
| **Aging należności** | Struktura wiekowa | Kwoty w przedziałach 0–30, 31–60, 61–90, 90+ dni | Rozrachunki | Tygodniowa | Słupkowy skumulowany | Identyfikacja przeterminowanych | Daty zapłaty vs daty wystawienia | Wysoki | [NetSuite](https://www.netsuite.com/portal/resource/articles/accounting/financial-kpis-metrics.shtml) |
| **Aging zobowiązań** | Struktura wiekowa zobowiązań | Analogicznie | Rozrachunki | Tygodniowa | Słupkowy skumulowany | Zarządzanie kalendarzem płatności | — | Wysoki | — |
| **% przeterminowanych należności** | Udział przeterminowanych | Σ przeterminowanych / Σ należności | Rozrachunki | Tygodniowa | Gauge + KPI | Sygnał ryzyka | Czasem korekty/spory zniekształcają | Wysoki | — |
| **Koncentracja należności** | Top N klientów dłużników | % Σ należności na N kontrahentach | Rozrachunki | Tygodniowa | Pareto + treemap | Ryzyko koncentracji | — | Wysoki | — |
| **Bad Debt Ratio** | Należności nieściągalne | Odpisy / Sprzedaż netto | Korekty + sprzedaż | Kwartalna | KPI | Jakość portfela | Polityka odpisów różna | Średni | — |
| **Prognoza wpływów (Cash Inflow Forecast)** | Spodziewane wpływy w czasie | Σ niezapłaconych faktur × prawdopodobieństwo wpłaty wg historii | Rozrachunki + historia płatności | Tygodniowa | Linia + przedziały | Planowanie cash flow | Wymaga modelu prawdopodobieństwa | Średni | — |

### 3.5 Magazyn i zapasy

| KPI | Co mierzy | Wzór | Dane | Częstotliwość | Wizualizacja | Interpretacja | Ryzyka | Priorytet | Źródła |
|---|---|---|---|---|---|---|---|---|---|
| **Wartość magazynu** | Zamrożony kapitał | Σ (stan × cena ewidencyjna) | Stany + cennik | Codzienna | KPI card + trend | Im niżej, tym lepiej (przy zachowaniu dostępności) | Metoda wyceny (FIFO/średnia) | Wysoki | — |
| **Inventory Turnover (rotacja)** | Ile razy zapas się obrócił | KWS / Średni stan magazynu | Magazyn + KWS | Miesięczna | KPI + benchmark | Wyższa = lepsze zarządzanie | Mix produktów | Wysoki | [NetSuite](https://www.netsuite.com/portal/resource/articles/accounting/financial-kpis-metrics.shtml) |
| **DOH (Days on Hand)** | Dni zapasu | 365 / Rotacja | Magazyn + KWS | Miesięczna | KPI | Pokrycie sprzedaży | — | Wysoki | [Extensiv](https://www.extensiv.com/blog/kpis-key-performance-indicators) |
| **GMROI (Gross Margin Return on Investment)** | Zysk z zł zainwestowanego w zapasy | Marża brutto / Średnia wartość zapasów | Sprzedaż + magazyn | Miesięczna | KPI card | Standard retailu | Trudna interpretacja bez benchmarku | Wysoki | [Slimstock](https://www.slimstock.com/blog/gmroi-gross-margin-return-on-investment/) |
| **Sell-through rate** | % sprzedanego z dostarczonego | Sprzedane jednostki / Otrzymane jednostki × 100% | Sprzedaż + PZ | Tygodniowa | Linia + tabela | Skuteczność rotacji nowych SKU | Okres analizy kluczowy | Średni | — |
| **Stockout rate** | Częstość braków | Liczba SKU z brakiem / Liczba SKU aktywnych | Stany magazynowe | Codzienna | KPI + alerty | Wpływ na sprzedaż utraconą | Definicja "braku" | Wysoki | — |
| **Zalegające towary (slow movers)** | SKU bez ruchu > N dni | Lista SKU z ostatnim WZ > 90/180/365 dni | Ruchy magazynowe | Tygodniowa | Tabela + treemap | Kandydaci do wyprzedaży | Sezonowość | Wysoki | — |
| **Nadwyżki (overstock)** | Stan > planu max | Stan − planowany max | Stany + polityka zapasu | Tygodniowa | Słupkowy | Zamrożony kapitał | Wymaga zdefiniowanego min/max | Średni | — |
| **Klasyfikacja ABC** | Wartość 80/15/5 | Skumulowany % sprzedaży/wartości | Sprzedaż per SKU | Miesięczna | Pareto + tabela | A = priorytet, C = redukcja | Aktualizacja co kwartał | Wysoki | [ABC Supply Chain](https://abcsupplychain.com/abc-xyz-analysis/), [Lokad](https://www.lokad.com/abc-xyz-analysis-inventory/) |
| **Klasyfikacja XYZ** | Stabilność popytu (CV) | CV = σ / średnia; X<10%, Y 10–25%, Z>25% | Sprzedaż per SKU, miesięcznie | Miesięczna | Macierz | X = przewidywalne, Z = wolatylne | Krótka historia zaburza | Wysoki | [ABC Supply Chain](https://abcsupplychain.com/abc-xyz-analysis/) |
| **Macierz ABC-XYZ (9 pól)** | Połączona klasyfikacja | 9 segmentów: AX, AY, AZ, BX...CZ | Sprzedaż per SKU | Kwartalna | Heatmapa 3×3 | AX = zapas wysoki, CZ = make-to-order | Wymaga obu klasyfikacji | Wysoki | [ABC Supply Chain](https://abcsupplychain.com/abc-xyz-analysis/) |
| **Inventory Accuracy** | Zgodność stanu fizycznego z systemem | (Stan fizyczny / Stan ewidencyjny) × 100% | Inwentaryzacje | Kwartalna | KPI + alerty | < 95% = problem | Częstotliwość inwentaryzacji | Wysoki | [NetSuite](https://www.netsuite.com/portal/resource/articles/erp/procurement-kpis.shtml) |
| **Zapas bezpieczeństwa (Safety Stock)** | Bufor na wahania | SS = z × σ_LT × √LT (klasyczny model) | Sprzedaż + lead time | Kwartalna | Tabela per SKU | Konfiguracja min/max | Założenia statystyczne | Średni | [Lokad](https://www.lokad.com/abc-xyz-analysis-inventory/) |
| **Carrying Cost of Inventory** | Koszt utrzymania zapasu | Średnia wartość × stopa kosztu (20–30% rocznie typowo) | Magazyn + szacunek kosztów | Roczna | KPI card | Często niedoszacowany | Wymaga zdefiniowania stopy | Średni | — |

### 3.6 Zakupy i dostawcy

| KPI | Co mierzy | Wzór | Dane | Częstotliwość | Wizualizacja | Interpretacja | Ryzyka | Priorytet | Źródła |
|---|---|---|---|---|---|---|---|---|---|
| **Wydatki ogółem (Total Spend)** | Skala zakupów | Σ faktury zakupu | Faktury zakupu | Miesięczna | KPI + trend | Baza wszystkich analiz | Kategoryzacja kluczowa | Wysoki | [Sievo](https://sievo.com/blog/procurement-kpis) |
| **Spend per dostawca** | Koncentracja zakupów | Σ wydatków per dostawca | Faktury zakupu | Miesięczna | Pareto + treemap | Ryzyko uzależnienia | — | Wysoki | [Sievo](https://sievo.com/blog/procurement-kpis) |
| **PPV (Purchase Price Variance)** | Odchylenie od ceny planowanej | (Cena rzeczywista − Cena standardowa) × Ilość | Faktury + cennik standardowy | Miesięczna | Waterfall | Skuteczność negocjacji | Wymaga cen standardowych | Wysoki | [NetSuite](https://www.netsuite.com/portal/resource/articles/erp/procurement-kpis.shtml) |
| **Zmienność cen (Price Volatility)** | Stabilność cen dostawców | σ ceny / średnia (CV) per SKU/dostawca | Historia faktur zakupu | Kwartalna | Boxplot + linia | Wybór dostawców | Sezonowość rynkowa | Średni | [Suplari](https://suplari.com/blog/procurement-kpis-in-spend-analysis) |
| **On-Time Delivery Rate** | Terminowość dostaw | (Dostawy na czas / Wszystkie dostawy) × 100% | ZK + PZ | Miesięczna | KPI + ranking | > 95% = dobry partner | Tolerancja czasowa do uzgodnienia | Wysoki | [NetSuite](https://www.netsuite.com/portal/resource/articles/erp/procurement-kpis.shtml) |
| **Supplier Lead Time** | Średni czas realizacji | Σ czasów dostawy / Liczba ZK | ZK + PZ z datami | Miesięczna | Linia + boxplot | Konfiguracja zapasów bezpieczeństwa | Definicja "start" lead time | Wysoki | [Sievo](https://sievo.com/blog/procurement-kpis) |
| **Lead Time Variance** | Wahania czasu dostawy | σ lead time | ZK + PZ | Kwartalna | Boxplot | Stabilność partnera | — | Średni | [Sievo](https://sievo.com/blog/procurement-kpis) |
| **Supplier Defect Rate** | Wadliwość | (Wadliwe sztuki / Otrzymane sztuki) × 100% | PZ + reklamacje | Miesięczna | KPI + ranking | Jakość dostaw | Wymaga rejestru reklamacji | Średni | [NetSuite](https://www.netsuite.com/portal/resource/articles/erp/procurement-kpis.shtml) |
| **PO Accuracy** | Poprawność zamówień | (Poprawne PO / Wszystkie PO) × 100% | ZK + korekty | Miesięczna | KPI | Efektywność procesu | — | Średni | [NetSuite](https://www.netsuite.com/portal/resource/articles/erp/procurement-kpis.shtml) |
| **Emergency Purchase Rate** | Udział zakupów awaryjnych | (Liczba awaryjnych / Wszystkie) × 100% | Klasyfikacja ZK | Miesięczna | KPI + alerty | < 5% = dobre planowanie | Definicja "awaryjny" | Średni | [NetSuite](https://www.netsuite.com/portal/resource/articles/erp/procurement-kpis.shtml) |
| **Spend Under Management** | % wydatków pod kontrolą | (Zarządzany spend / Total) × 100% | Klasyfikacja zakupów | Kwartalna | KPI | Maturity procurementu | Wymaga klasyfikacji | Niski | [Sievo](https://sievo.com/blog/procurement-kpis) |
| **Maverick Spend** | Zakupy poza procedurą | Σ zakupów poza ZK / Total | Faktury vs ZK | Miesięczna | KPI + alerty | Ryzyko kosztów | — | Średni | [Sievo](https://sievo.com/blog/procurement-kpis) |

### 3.7 Kontrahenci i CRM

| KPI | Co mierzy | Wzór | Dane | Częstotliwość | Wizualizacja | Interpretacja | Ryzyka | Priorytet | Źródła |
|---|---|---|---|---|---|---|---|---|---|
| **Liczba aktywnych klientów** | Baza klientów | Klienci z transakcją w okresie | Faktury + kartoteki | Miesięczna | KPI + trend | Definicja "aktywny" (30/90/365 dni) | — | Wysoki | — |
| **Nowi vs powracający** | Mix akwizycji/retencji | Σ sprzedaży / klient pierwsza vs kolejna | Faktury + pierwsza data | Miesięczna | Słupkowy skumulowany | Zdrowy mix zależy od modelu | — | Wysoki | [ThoughtSpot](https://www.thoughtspot.com/data-trends/ecommerce-kpis-metrics) |
| **Churn Rate** | Odpływ klientów | (Klienci utraceni / Klienci na początku) × 100% | Faktury historyczne | Miesięczna | Linia | Definicja utraty (90/180 dni bez transakcji) | Dla B2B trudne do zdefiniowania | Wysoki | [Churnkey](https://churnkey.co/blog/customer-retention-kpis/) |
| **Retention Rate** | Utrzymanie klientów | (Klienci na końcu − Nowi) / Klienci na początku | Faktury + daty | Miesięczna | Linia | Komplement churn | — | Wysoki | [Churnkey](https://churnkey.co/blog/customer-retention-kpis/) |
| **Customer Lifetime Value (LTV / CLV)** | Wartość klienta w cyklu życia | **Wariant 1**: ARPU × Marża / Churn rate; **Wariant 2**: Średnia wartość zakupu × Częstotliwość × Średni czas życia | Faktury + churn | Kwartalna | KPI + segmentacja | Punkt odniesienia dla CAC | Wrażliwe na założenia churn; różne definicje | Średni | [Klipfolio](https://www.klipfolio.com/resources/kpi-examples/digital-marketing/customer-lifetime-value), [ChartMogul](https://chartmogul.com/saas-metrics/ltv/), [Fincome](https://www.fincome.co/blog/lifetime-value-ltv-meaning-calculation) |
| **Częstotliwość zakupów** | Liczba transakcji na klienta | Σ transakcji / Σ aktywnych klientów | Faktury | Miesięczna | Histogram | RFM analysis | Outliery | Średni | — |
| **Recency** | Dni od ostatniej transakcji | dzisiaj − max(data faktury) per klient | Faktury | Codzienna | Heatmapa RFM | Sygnał ryzyka odpływu | — | Średni | — |
| **RFM Score** | Segmentacja Recency-Frequency-Monetary | Punktacja 1–5 w każdej osi | Faktury | Kwartalna | Heatmapa + treemap | Klasyczna segmentacja | — | Średni | — |
| **Koncentracja przychodów (Top N)** | % przychodu z top 5/10/20 klientów | Skumulowany udział | Faktury | Miesięczna | Pareto | Ryzyko koncentracji | — | Wysoki | — |
| **Cohort Retention** | Utrzymanie klientów wg miesiąca akwizycji | Macierz: kohorta × miesiąc | Faktury + pierwsza data | Kwartalna | Heatmapa kohort | Identyfikacja zmian w jakości akwizycji | Mała próba w kohorcie | Średni | [Hex](https://hex.tech/templates/reporting/cohort-analysis/) |

### 3.8 Operacje i jakość danych

| KPI | Co mierzy | Wzór | Dane | Częstotliwość | Wizualizacja | Interpretacja | Ryzyka | Priorytet | Źródła |
|---|---|---|---|---|---|---|---|---|---|
| **Order Cycle Time** | Czas od ZK do dostawy | Data dostawy − Data zamówienia | Zamówienia + WZ | Tygodniowa | Linia + boxplot | Wydajność procesu | Definicja "start"/"koniec" | Wysoki | — |
| **Perfect Order Rate** | % zamówień bez błędu | (Zamówienia bezbłędne / Wszystkie) × 100% | Zamówienia + reklamacje | Miesięczna | KPI | Standard logistyczny | Definicja "bezbłędny" (na czas, kompletne, bez uszkodzeń, bez błędu w dokumencie) | Wysoki | [DCL Logistics](https://dclcorp.com/blog/fulfillment/perfect-order-rate/), [Benchmarking Success](https://www.benchmarkingsuccess.com/the-perfect-order-kpi-is-it-the-best-metric-ever/) |
| **Dokumenty zaległe** | Niezamknięte dokumenty | Liczba dokumentów otwartych > N dni | Wszystkie dokumenty | Codzienna | KPI + alerty | Czyszczenie ksiąg | — | Wysoki | — |
| **Dokumenty bez powiązań** | Faktury bez ZK / WZ bez ZK | Liczba dokumentów osieroconych | Powiązania | Tygodniowa | Tabela + alerty | Problem procesowy | — | Średni | — |
| **Data Completeness