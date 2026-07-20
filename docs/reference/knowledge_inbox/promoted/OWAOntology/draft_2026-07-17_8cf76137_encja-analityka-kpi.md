# Encja: Analityka / KPI
- draftId: `draft_2026-07-17_8cf76137_encja-analityka-kpi`
- kbNamespace: `OWAOntology`
- status: `promoted`
- promotedAt: `2026-07-20T11:38:46.189Z`
- tags: `OWA`, `ontologia`, `optima`, `analityka-kpi`, `częściowo-zweryfikowane`
- reviewNote: Bulk approved 50 drafts from dashboard
## Content
# Encja: Analityka / KPI

## Identyfikacja

- **Typ encji:** Agregat (nie jest pojedynczą tabelą MSSQL)
- **Źródło danych:** Obliczenia i agregacje na wielu tabelach Optima
- **Status weryfikacji:** częściowo-zweryfikowane (narzędzia MCP istnieją, nie wykonano walidacji danych)

## Natura encji

Analityka/KPI to abstrakcyjna encja reprezentująca wskaźniki biznesowe obliczane dynamicznie na podstawie danych transakcyjnych. W odróżnieniu od encji tabelarycznych, KPI nie mają stałego schematu — każde narzędzie MCP zwraca strukturę dostosowaną do konkretnego zapytania analitycznego.

## Narzędzia MCP READ (wszystkie zweryfikowane jako dostępne)

### Sprzedaż i marża

| Narzędzie | Opis |
|-----------|------|
| `get_executive_kpis` | Kluczowe KPI: sprzedaż, marża brutto (%), przeterminowane należności, wartość magazynu, DSO, DPO, CCC, EBITDA, wzrost YoY |
| `get_executive_dashboard` | Dashboard zarządczy: sprzedaż, marża, DSO, należności, Top5 klientów, wartość magazynu, trend 12M |
| `get_sales_kpis` | Wskaźniki sprzedaży: sprzedaż całkowita, liczba faktur, AOV (średnia wartość zamówienia), top 10 klientów, trend miesięczny 12M |
| `get_sales_trend` | Trend sprzedaży miesięcznej (12M) |
| `get_sales_margin` | Marża sprzedaży wg klienta/towaru/okresu |
| `get_sales_by_category` | Sprzedaż wg kategorii towarów: przychód, liczba dokumentów, udział % |

### Magazyn i zapasy

| Narzędzie | Opis |
|-----------|------|
| `get_inventory_kpis` | Wskaźniki magazynowe: wartość magazynu, DOH (dni zapasu), dead stock (wartość i %), GMROI |
| `get_inventory_abc_xyz` | Klasyfikacja ABC × XYZ (wg wartości rocznej sprzedaży × zmienności) |
| `get_inventory_aging` | Wiek zapasu: 0-30, 31-90, 91-365, >365 dni |

### Płynność i należności

| Narzędzie | Opis |
|-----------|------|
| `get_liquidity_kpis` | Wskaźniki płynności: należności, zobowiązania, kapitał obrotowy, current ratio, quick ratio |
| `get_receivables_aging` | Struktura wiekowa należności: bieżące, 31-60, 61-90, 90+ dni |
| `get_payables_aging` | Struktura wiekowa zobowiązań: bieżące, 31-60, 61-90, 90+ dni |
| `get_receivables_detail` | Szczegóły należności: top 20 dłużników, kwoty, dni przeterminowania |
| `get_cash_forecast` | Prognoza wpływów i wypływów gotówkowych |

### Klienci

| Narzędzie | Opis |
|-----------|------|
| `get_customer_health` | Zdrowie bazy klientów: aktywni, nowi, utraceni, retencja %, koncentracja Top5/Top10, indeks HHI |
| `get_customer_rfm` | Segmentacja RFM (Recency, Frequency, Monetary) |

### Zakupy i rentowność

| Narzędzie | Opis |
|-----------|------|
| `get_procurement_kpis` | Wskaźniki zakupowe: suma zakupów, liczba faktur, top suppliers z udziałem % |
| `get_profitability` | Rentowność: GrossMargin, EBITDA, NetMargin |

### Jakość i compliance

| Narzędzie | Opis |
|-----------|------|
| `get_data_quality` | Jakość danych: duplikaty kontrahentów, braki kontaktu, braki kategorii |
| `get_anomalies` | Detekcja anomalii biznesowych |
| `get_audit_readiness` | Audyt gotowości: 9 sprawdzeń + score |
| `get_ksef_compliance` | KSeF compliance: SendLag, UPO, SplitPayment |

## Tabele źródłowe (najważniejsze)

- `CDN.TraNag`, `CDN.TraElem` — dokumenty i pozycje (sprzedaż, marża)
- `CDN.Kontrahenci`, `CDN.KntOsoby` — kontrahenci (należności, segmentacja RFM)
- `CDN.Towary`, `CDN.TwrIlosci`, `CDN.TwrCeny` — towary, stany, ceny
- `CDN.TwrCeny` — cenniki
- `CDN.Magazyny` — magazyny
- `CDN.BnkZdarzenia`, `CDN.BnkZapisy` — zdarzenia i zapisy bankowe
- `CDN.KsiRozrachunki` — rozrachunki
- `CDN.DekretyNag`, `CDN.DekretyElem` — dekrety księgowe
- `CDN.Konta`, `CDN.OkresyObrach` — plan kont, okresy obrachunkowe

## Reguły biznesowe

1. KPI są obliczane na żądanie — nie są przechowywane jako dane statyczne.
2. Większość narzędzi akceptuje parametry `date_from` / `date_to` do filtrowania okresu.
3. Wskaźniki płynności (DSO, DPO, CCC) są obliczane na podstawie dat płatności z `TraNag` i `BnkZdarzenia`.
4. Segmentacja RFM używa okna 12 miesięcy od daty bieżącej.
5. Klasyfikacja ABC/XYZ opiera się na rocznej wartości sprzedaży (`TraElem` × ceny) i zmienności miesięcznej.