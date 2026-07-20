# Encja: Personel / Współpracownik
- draftId: `draft_2026-07-17_4e0cebf0_encja-personel-wspo-pracownik`
- kbNamespace: `OWAOntology`
- status: `promoted`
- promotedAt: `2026-07-20T11:42:24.921Z`
- tags: `OWA`, `ontologia`, `optima`, `personel`, `częściowo-zweryfikowane`
- reviewNote: Bulk approved 50 drafts from dashboard
## Content
# Encyja: Personel / Współpracownik

## Status weryfikacji
**Częściowo zweryfikowane** — widoki MSSQL i endpointy MCP potwierdzone, ale **struktura tabel bazowych niezweryfikowana**.

## Opis biznesowy
Personel obejmuje pracowników, operatorów i współpracowników w Optimie. Dane dostępne przez widoki: `CDN.PracownicyView` (lista pracowników), `CDN.OperatorzyView` (operatorzy systemu). Tabele bazowe to prawdopodobnie `CDN.Personel` [UNKNOWN — nie potwierdzone] oraz `CDN.DetalOperator`. Struktury kadrowe dostępne przez `list_personnel_structures`.

## Reguły biznesowe
- Operator posiada uprawnienia do modyfikacji danych (śledzone przez OpeModId/OpeZalId w wielu tabelach)
- Pracownik posiada dane kadrowo-płacowe (umowy, nieobecności, limitów)
- Struktury kadrowe (działy, stanowiska) są osobnym bytem

## Źródła danych
- **Widoki**: `CDN.PracownicyView`, `CDN.OperatorzyView`
- **Tabele**: `CDN.Personel` [UNKNOWN], `CDN.DetalOperator`, `CDN.DetalStanOperatorzy`
- **Powiązane**: `CDN.Dzialy`, `CDN.DefinicjaZmian`, `CDN.TypWyplata`

## Identyfikatory
| Pole | Typ | Opis |
|------|-----|------|
| [UNKNOWN] | [UNKNOWN] | PK tabeli Personel nieznany |

## Pola i mapowanie API↔MSSQL
Wszystkie pola — niezweryfikowane. Struktury kolumn nieznane.

## Relacje ontologiczne
- **JEST_OPERATOREM** — dane w `CDN.OperatorzyView`, `CDN.DetalOperator`
- **JEST_PRACOWNIKIEM** — dane w `CDN.PracownicyView`
- **NALEZY_DO_DZIALU** (N:1) → `CDN.Dzialy` [UNKNOWN kolumna]
- **TWORZY_DOKUMENTY** (1:N) → śledzone przez OpeZalId/OpeModId w innych tabelach
- **POSIADA_STRUKTURE** (1:N) → `list_personnel_structures`

## Endpointy OptimaMCP
| Narzędzie | Operacja |
|-----------|----------|
| `list_personnel` | READ — lista personelu |
| `list_personnel_structures` | READ — struktury kadrowe |
| `list_personnel` [inne?] | WRITE — [UNKNOWN] |

## Pochodzenie wiedzy
- `mssql_execute_query`: INFORMATION_SCHEMA potwierdza `CDN.PracownicyView`, `CDN.OperatorzyView`, `CDN.DetalOperator`, `CDN.DetalStanOperatorzy`
- `mssql_list_tables` (schema=CDN) zawiera `Dzialy`, `DefinicjaZmian`, `TypWyplata`
- Endpointy MCP zdefiniowane w AGENTS.md

## Otwarte problemy
1. Czy istnieje tabela `CDN.Personel`? Nazwa nie pojawiła się w wynikach INFORMATION_SCHEMA.
2. Jakie są kolumny w `CDN.PracownicyView` i `CDN.OperatorzyView`?
3. Relacja Personel ↔ Kontrahenci (współpracownik jako kontrahent)?
4. Endpointy WRITE dla personelu? (MCP ma tylko READ)
5. Struktura `list_personnel_structures` — co zwraca?

## Metadane
- Wykryte przez: `manual_analysis_mcp_mssql`
- Data pozyskania: 2026-07-15
- Widoki: `CDN.PracownicyView`, `CDN.OperatorzyView`
- Tabela bazowa: niepotwierdzona

## Walidacja
- [ ] Wykonaj `mssql_describe_table` dla Personel (jeśli istnieje)
- [ ] Wykonaj SELECT TOP 1 * FROM CDN.PracownicyView
- [ ] Wykonaj SELECT TOP 1 * FROM CDN.OperatorzyView
- [ ] Zweryfikuj `list_personnel` runtime
- [ ] Ustal czy istnieją endpointy WRITE dla personelu