# Zmiany w JPK VAT. Dopasowanie do KSeF, nowe wzory JPK V7M(3), JPK V7K(3). Nowe oznaczenia: NrKSeF, OFF, BFK, DI - Infor.pl
- draftId: `draft_2026-07-01_de720ffd_zmiany-w-jpk-vat-dopasowanie-do-ksef-nowe-wzory-jpk-v7m-3-jpk-v7k-3-nowe-oznacze`
- kbNamespace: `TaxbellAccountingVATReference`
- status: `promoted`
- promotedAt: `2026-07-02T06:26:32.940Z`
- sourceUrl: https://ksiegowosc.infor.pl/podatki/vat/jpk-vat/7482682,zmiany-w-jpk-vat-dopasowanie-do-ksef-nowe-wzory-jpk-v7m3-jpk-v7k3-nowe-oznaczenia-nrksef-off-bfk-di.html
- tags: `discovery`, `professional`, `VAT`, `JPK`, `KSeF`, `rachunkowość`
- reviewNote: Bulk approved 7 drafts from dashboard
## Content
Automated source-discovery draft.

Query: VAT JPK KSeF rachunkowość zmiany 2026
Source: https://ksiegowosc.infor.pl/podatki/vat/jpk-vat/7482682,zmiany-w-jpk-vat-dopasowanie-do-ksef-nowe-wzory-jpk-v7m3-jpk-v7k3-nowe-oznaczenia-nrksef-off-bfk-di.html
Tier: professional
Discovery confidence: 0.9

```
| **Nazwa** |
|----------------------------------------------------------------|
| \\[CDN\\].\\[CapitalizeFirstChar\\] |
| \\[CDN\\].\\[DayOfWeekNo\\] |
| \\[CDN\\].\\[DniSwiateczne\\] |
| \\[CDN\\].\\[fnPieczatkaEN\\] |
| \\[CDN\\].\\[Jpk_V7_Information\\] |
| \\[CDN\\].\\[Jpk_V7_Xml2Deklaracja\\] |
| \\[CDN\\].\\[KorektaPodatku_DataKsiegowania\\] |
| \\[CDN\\].\\[KorektaPodatku_KwotaDoKorekty\\] |
| \\[CDN\\].\\[KorektaPodatku_PozycjeVAT\\] |
| \\[CDN\\].\\[KorektaPodatku_RozliczonaKwota\\] |
| \\[CDN\\].\\[KorektaPodatku_Skorygowano\\] |
| \\[CDN\\].\\[KorektaPodatku_UdzialDoPozycji\\] |
| \\[CDN\\].\\[KorektaPodatku_UstalCzyJestNaPozniejszychKorektach\\] |
| \\[CDN\\].\\[KorektaPodatku_UstalPierwszy\\] |
| \\[CDN\\].\\[KorektaPodatku_UstalRodzaj\\] |
| \\[CDN\\].\\[KorektaPodatku_UstalZaplacona\\] |
| \\[CDN\\].\\[KorektaPodatku_Usuniete\\] |
| \\[CDN\\].\\[OperatorzyDzialy\\] |
| \\[CDN\\].\\[PlikJpkSkorygowany\\] |
| \\[CDN\\].\\[SprzedazVAT_Marza\\] |
| \\[CDN\\].\\[SymbolDeklaracjiPR\\] |
| \\[CDN\\].\\[TodayOrWeekOrMonth\\] |
| \\[CDN\\].\\[Vat7KwotaDoZwrotu\\] |
| \\[CDN\\].\\[VATZD_ZapisyKorekcyjneEx\\] |
| \\[CDN\\].\\[ZakupVAT_Marza\\] |
F_KatStawkiVAT
**KatStawkiVAT**
*Lista stawek zagranicznych kategorii\\
<span class="small">Tabela stawek zagranicznych kategorii.</span>*
<div align="center">
| | | |
|-------------------|-----------------------|-------------------------|
| [**Pola**](#Pola) | [**Klucze**](#Klucze) | [**Relacje**](#Relacje) |
</div>
------------------------------------------------------------------------
\
<span id="Pola">**Pola**</span>
| **Nazwa** | **Typ** | **Opis** | **Opcje** |
|----|----|----|----|
| KaV_KaVID | INTEGER | Identyfikator rekordu | IDENTITY(1,1) |
| KaV_KatID | INTEGER | Klucz obcy do kategorii | NOT NULL |
| KaV_KodKraju | VARCHAR(5) | Kod kraju | NOT NULL |
| KaV_Stawka | DECIMAL( 5,2) | Wartość procentowa stawki VAT | NOT NULL |
| KaV_Flaga | SMALLINT | Typ stawki | NOT NULL |
| KaV_Zrodlowa | DECIMAL( 5,2) | Stawka źródłowa dla stawki zaniżonej | NOT NULL |
| KaV_Rodzaj | SMALLINT | Rodzaj stawki | NOT NULL |
\
------------------------------------------------------------------------
\
<span id="Klucze">**Klucze**</span>
F_VatTab7
**VatTab7**
*Kwoty VAT do rozlicznenia metodą "kasową"\\
<span class="small">Pomocnicza tabela elementów (pozycji) dokumentu w rejestrze Vat służąca do rozliczenia deklaracji Vat-7 metodą kasową.</span>*
<div align="center">
| | | |
|-------------------|-----------------------|-------------------------|
| [**Pola**](#Pola) | [**Klucze**](#Klucze) | [**Relacje**](#Relacje) |
</div>
------------------------------------------------------------------------
\
<span id="Pola">**Pola**</span>
| **Nazwa** | **Typ** | **Opis** | **Opcje** |
|----|----|----|----|
| Va7_Va7ID | INTEGER | Identyfikator zapisu | IDENTITY(1,1) |
| Va7_VaNID | INTEGER | Wskaźnik do nagłówka dokumentu Wskaźnik do nagłówka VatNag: VaT:VaNId = VaN:VaNId | NOT NULL |
| Va7_RokMiesiac | INTEGER | Rok i miesiąc (lub kwartał) w którym będzie rozliczany zapis | NOT NULL |
| Va7_RodzajZakupu | SMALLINT | Rodzaj zakupu | NOT NULL |
| Va7_Stawka | DECIMAL( 5,2) | Wartość procentowa stawki VAT | NOT NULL |
| Va7_Flaga | SMALLINT | Typ stawki Przyjmuje wartości: - Zwolniona - 1 (e_mk_StawkaVAT_Zwolniona) - Opodatkowana - 2 (e_mk_StawkaVAT_Opodatkowana) - Zaniżona - 3 (e_mk_StawkaVAT_Zanizona) - Nie podlega - 4 (e_mk_StawkaVAT_NiePodlega) | NOT NULL |
| Va7_Zrodlowa | DECIMAL( 5,2) | Stawka źródłowa dla stawki zaniżonej | NOT NULL |
| Va7_Netto | DECIMAL(15,2) | Kwota netto | NOT NULL |
| Va7_VAT | DECIMAL(15,2) | Kwota VAT | NOT NULL |
| Va7_Odliczenia | SMALLINT | Odliczenia VAT | NOT NULL CONSTRAINT DF_Va7_Odliczenia DEFAULT(0) |
\
------------------------------------------------------------------------
\
<span id="Klucze">**Klucze**</span>
<table data-border="1" data-cellspacing="0" data-cellpadding="5" width="100%">
<colgroup>
<col style="width: 25%" />
<col style="width: 25%" />
<col style="width: 25%" />
<col style="width: 25%" />
</colgroup>
<thead>
<tr>
<th style="border-right: solid white 0.5pt" width="20%"><strong>Nazwa</strong></th>
<th style="border-right: solid white 0.5pt; border-left: solid white 0.5pt" width="20%"><strong>Pola</strong></th>
<th style="border-right: solid white 0.5pt; border-left: solid white 0.5pt"><strong>Opis</strong></th>
<th style="border-left: solid white 0.5pt" width="20%"><strong>Opcje</strong></th>
</tr>
</thead>
<tbody>
<tr>
<td>KaV_Primary</td>
<td>KaV_KaVID</td>
<td>Wg identyfikatora rekordu </td>
<td>PRIMARY<br />
UNIQUE</td>
</tr>
<tr>
<td>KaVKategoria</td>
<td>KaV_KatID,KaV_KodKraju</td>
<td>Wg kategorii i kodu kraju </td>
<td>UNIQUE NONCLUSTERED</td>
</tr>
</tbody>
</table>
\
------------------------------------------------------------------------
\
<span id="Relacje">**Relacje**</span>
<table data-border="1" data-cellspacing="0" data-cellpadding="5" width="100%">
<tbody>
<tr>
<th style="border-bottom: solid white 0.5pt" width="20%">Tabele</th>
<td width="20%"><strong>KatStawkiVAT</strong></td>
<td style="text-align: center;" width="20%">(MANY:1)</td>
<td width="20%"><strong>Kategorie</strong></td>
</tr>
<tr>
<th style="border-bottom: solid white 0.5pt; border-top: solid white 0.5pt">Pola łączące</th>
<td>KaV_KatID</td>
<td style="text-align: center;">=</td>
<td>Kat_KatID</td>
</tr>
<tr>
<th style="border-top: solid white 0.5pt">Opcje</th>
<td colspan="3">Klucz obcy <strong>FK_KaVKategoria</strong></td>
</tr>
</tbody>
</table>
------------------------------------------------------------------------
Korekta ilościowa faktury wewnętrznej sprzedaży
Korekta wartościowa faktury wewnętrznej sprzedaży
Korekta stawki VAT faktury wewnętrznej sprzedaży
Faktura wewnętrzna sprzedaży przekształocna z FZ
Dokument Tax Free
Faktura zakupu od rolnika ryczałtowego (Faktura RR)
Faktura zakupu od rolnika ryczałtowego (Faktura RR) - korekta ilości
Faktura zakupu od rolnika ryczałtowego (Faktura RR) - korekta wartości
Faktura zakupu od rolnika ryczałtowego (Faktura RR) - korekta stawki VAT
Faktura RR z wygenerowanym FZ
Faktura RR z wygenerowanym PZ
F_VatNag
**VatNag**
*Tabela z nagłówkami rejestrów VAT\\
<span class="small">Nagłówki dokumentów w rejestrze Vat. Tabela VatNag zawiera informacje o dacie dokumentu, kontrahencie itp, tabela VatTab zawiera informacje o pozycjach dokumentu, zagregowanych do poszczególnych stawek Vat</span>*
<div align="center">
| | | |
|-------------------|-----------------------|-------------------------|
| [**Pola**](#Pola) | [**Klucze**](#Klucze) | [**Relacje**](#Relacje) |
</div>
------------------------------------------------------------------------
\
<span id="Pola">**Pola**</span>
```

Review this draft before promotion.