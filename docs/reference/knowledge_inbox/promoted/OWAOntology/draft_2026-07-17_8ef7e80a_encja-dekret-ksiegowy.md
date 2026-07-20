# Encja: Dekret księgowy
- draftId: `draft_2026-07-17_8ef7e80a_encja-dekret-ksiegowy`
- kbNamespace: `OWAOntology`
- status: `promoted`
- promotedAt: `2026-07-20T11:42:25.859Z`
- tags: `OWA`, `ontologia`, `optima`, `dekret-ksiegowy`, `częściowo-zweryfikowane`
- reviewNote: Bulk approved 50 drafts from dashboard
## Content
# Encja: Dekret księgowy

## Status weryfikacji
- Status: `częściowo-zweryfikowane`
- Poziom pewności: `wysoki`
- Identyfikator ontologiczny: `OWAOntology.DekretKsiegowy`
- Aliasy: `DekretyNag`, `DekretyElem`, `JournalEntry`, `Decree`

## Opis biznesowy
Dekret księgowy w Comarch Optima to podstawowy zapis księgowy składający się z nagłówka (`CDN.DekretyNag`) i elementów (`CDN.DekretyElem`). Każdy dekret księguje operację gospodarczą na kontach księgowych zgodnie z zasadą podwójnego zapisu (Winien/Ma). Dekret może być powiązany z dokumentem źródłowym (np. fakturą, płatnością, kompensatą, notą odsetkową) przez referencje z tych tabel (`KPN_DekID`, `NON_DekId`, `VaN_DekID`, `BON_DekId`).

## Reguły biznesowe
- Każdy dekret musi się bilansować (suma Winien = suma Ma)
- Dekret jest przypisany do dziennika i okresu obrachunkowego
- Może być wynikiem automatycznej dekretacji dokumentu (`POST /accounting/decree`)
- Może być kopiowany (`decree_copy`), korygowany (`decree_correct`), stornaowany (`decree_reverse`)
- Przeksięgowanie (`POST /accounting/repost`) tworzy nowy dekret korygujący
- Anulowanie księgowania (`POST /accounting/cancel`) cofa dekret

## Źródła danych
| Rola źródła | Schemat | Tabela | Status | Dowód |
|---|---|---|---|---|
| Nagłówki dekretów | CDN | DekretyNag | Potwierdzona | MSSQL |
| Elementy dekretów | CDN | DekretyElem | Potwierdzona | MSSQL |
| Konta księgowe | CDN | Konta | Potwierdzona | MSSQL |

## Endpointy OptimaMCP
| Kierunek | Narzędzie MCP | Endpoint API | Status |
|---|---|---|---|
| READ | list_dekretynag | — | Potwierdzone |
| READ | list_dekretyelem | — | Potwierdzone |
| WRITE | create_journal_entry | POST /api/v1/journal-entries | Potwierdzone |
| WRITE | decree_copy | POST /api/v1/decrees/copy | Potwierdzone |
| WRITE | decree_correct | POST /api/v1/decrees/correct | Potwierdzone |
| WRITE | decree_reverse | POST /api/v1/decrees/reverse | Potwierdzone |

## Identyfikatory
| Typ | Pole | Znaczenie | Status |
|---|---|---|---|
| PK (Nag) | [Do ustalenia] | ID nagłówka dekretu | Oczekuje potwierdzenia |
| FK (Nag) | [Do ustalenia] | FK do Dzienniki | Oczekuje potwierdzenia |
| FK (Elem) | [Do ustalenia] | FK do DekretyNag | Oczekuje potwierdzenia |
| FK (Elem) | [Do ustalenia] | FK do Konta (Acc_AccId) | Oczekuje potwierdzenia |

## Referencje zwrotne z innych encji
| Tabela źródłowa | Kolumna FK | Znaczenie |
|---|---|---|
| KompensatyNag | KPN_DekID | Dekret dla kompensaty |
| KompensatyNag | KPN_PreDekID | Wstępny dekret kompensaty |
| NotyOdsNag | NON_DekId | Dekret dla noty odsetkowej |
| NotyOdsNag | NON_PreDekId | Wstępny dekret noty |
| VatNag | VaN_DekID | Dekret dla rejestru VAT |
| BONag | BON_DekId | Dekret dla BO |

## Relacje ontologiczne
| Predykat | Źródło | Cel | Kardynalność | Warunek JOIN |
|---|---|---|---|---|
| należy_do_dziennika | DekretKsiegowy | Dziennik | N:1 | DekretyNag → Dzienniki |
| księguje_na_koncie | DekretElem | KontoKsiegowe | N:1 | DekretyElem → Konta |
| zawiera_elementy | DekretKsiegowy | DekretElem | 1:N | DekretyElem → DekretyNag |
| pochodzi_z_dokumentu | DekretKsiegowy | TraNag | N:1 | Przez dokument źródłowy |

## Pochodzenie wiedzy
| Typ źródła | Narzędzie | Zakres |
|---|---|---|
| MSSQL (CDN_TEST) | mssql_list_tables | CDN.DekretyNag, CDN.DekretyElem |
| OptimaMCP | list_dekretynag, list_dekretyelem | API READ |
| OptimaMCP | create_journal_entry, decree_copy, decree_correct, decree_reverse | API WRITE |
| OptimaKB | OpenSPG | ComarchOptimaSchema (relacje) |

## Otwarte problemy
- [UNKNOWN: pełny schemat DekretyNag i DekretyElem — wymaga mssql_describe_table]
- [UNKNOWN: PK i FK DekretyNag — do potwierdzenia]
- [UNKNOWN: mechanizm automatycznej dekretacji — schematy księgowe?]
- [UNKNOWN: różnica między decree_reverse a accounting_cancel]

## Metadane
- Ontologia: OWA
- Namespace: OWAOntology
- Data ostatniej aktualizacji: 2026-07-15