#!/usr/bin/env node

import path from 'path';
import { answerQuestion } from './erp_knowledge_answer.mjs';
import { recordLearningGap } from './lib/learning.mjs';
import { writeFileAtomically } from './lib/atomic_file.mjs';

const ROOT = '/docker/openspg';
const ALL_QUESTIONS = [
  // Schema
  {"id":"Q002","category":"schema","expectedPrimaryKb":"ComarchOptimaSchema","question":"Które klucze łączą dokument handlowy z kontrahentem?"},
  {"id":"Q003","category":"schema","expectedPrimaryKb":"ComarchOptimaSchema","question":"Jakie obiekty SQL czytają tabelę TraNag?"},
  {"id":"Q004","category":"schema","expectedPrimaryKb":"ComarchOptimaSchema","question":"Jakie obiekty zapisują do TraElem?"},
  {"id":"Q005","category":"schema","expectedPrimaryKb":"ComarchOptimaSchema","question":"Jak znaleźć join path od dokumentu do definicji dokumentu?"},
  {"id":"Q006","category":"schema","expectedPrimaryKb":"ComarchOptimaSchema","question":"Jak wygląda ścieżka joinów od BnkZapisy do kontrahenta?"},
  {"id":"Q007","category":"schema","expectedPrimaryKb":"ComarchOptimaSchema","question":"Które tabele są nagłówkami handlowymi, a które pozycjami?"},
  {"id":"Q008","category":"schema","expectedPrimaryKb":"ComarchOptimaSchema","question":"Jakie procedury dotykają Kontrahenci?"},
  {"id":"Q009","category":"schema","expectedPrimaryKb":"ComarchOptimaSchema","question":"Jakie funkcje dotykają Towary?"},
  {"id":"Q010","category":"schema","expectedPrimaryKb":"ComarchOptimaSchema","question":"Które widoki albo funkcje używają TraElem?"},
  {"id":"Q011","category":"schema","expectedPrimaryKb":"ComarchOptimaSchema","question":"Jak powiązać VAT nagłówek z VAT pozycjami?"},
  {"id":"Q012","category":"schema","expectedPrimaryKb":"ComarchOptimaSchema","question":"Jakie są kluczowe FK dla Kontrahenci w dokumentach handlowych?"},
  {"id":"Q013","category":"schema","expectedPrimaryKb":"ComarchOptimaSchema","question":"Które obiekty SQL czytają PracEtaty i Pracownicy?"},
  {"id":"Q014","category":"schema","expectedPrimaryKb":"ComarchOptimaSchema","question":"Jakie indeksy i FK są na Towary?"},
  {"id":"Q015","category":"schema","expectedPrimaryKb":"ComarchOptimaSchema","question":"Które tabele są słownikowe w obszarze konfiguracji?"},
  {"id":"Q016","category":"schema","expectedPrimaryKb":"ComarchOptimaSchema","question":"Jak znaleźć relacje między CfgKlucze i CfgWartosci?"},
  {"id":"Q017","category":"schema","expectedPrimaryKb":"ComarchOptimaSchema","question":"Jakie procedury obsługują wydruki lub Wydruki?"},
  {"id":"Q018","category":"schema","expectedPrimaryKb":"ComarchOptimaSchema","question":"Jakie tabele łączą się z operatorami i bazami w konfiguracji?"},
  {"id":"Q019","category":"schema","expectedPrimaryKb":"ComarchOptimaSchema","question":"Jak znaleźć obiekty SQL związane z Wydruki?"},
  {"id":"Q020","category":"schema","expectedPrimaryKb":"ComarchOptimaSchema","question":"Które funkcje lub procedury używają BnkZapisy?"},
  {"id":"Q021","category":"schema","expectedPrimaryKb":"ComarchOptimaSchema","question":"Jak znaleźć zależności obiektu SQL do tabel handlowych?"},
  {"id":"Q022","category":"schema","expectedPrimaryKb":"ComarchOptimaSchema","question":"Który join route prowadzi od dokumentu do produktu?"},
  {"id":"Q023","category":"schema","expectedPrimaryKb":"ComarchOptimaSchema","question":"Jakie triggery są na tabelach handlowych?"},
  {"id":"Q024","category":"schema","expectedPrimaryKb":"ComarchOptimaSchema","question":"Jak znaleźć object dependency dla TraNag i Kontrahenci?"},
  {"id":"Q025","category":"schema","expectedPrimaryKb":"ComarchOptimaSchema","question":"Jakie procedury raportowe mają GetReportContent albo GetReportHeader?"},
  // Additional Functions
  {"id":"Q027","category":"additional_functions","expectedPrimaryKb":"ComarchOptimaAdditionalFunctions","question":"Jakie są tryby uruchamiania funkcji dodatkowych?"},
  {"id":"Q028","category":"additional_functions","expectedPrimaryKb":"ComarchOptimaAdditionalFunctions","question":"Jakie przykłady COM dotyczą handlu i magazynu?"},
  {"id":"Q029","category":"additional_functions","expectedPrimaryKb":"ComarchOptimaAdditionalFunctions","question":"Jakie interfejsy COM pojawiają się przy logowaniu?"},
  {"id":"Q030","category":"additional_functions","expectedPrimaryKb":"ComarchOptimaAdditionalFunctions","question":"Które przykłady FD dotykają TraNag albo TraElem?"},
  {"id":"Q031","category":"additional_functions","expectedPrimaryKb":"ComarchOptimaAdditionalFunctions","question":"Jak znaleźć przykład dodawania operatora przez COM?"},
  {"id":"Q032","category":"additional_functions","expectedPrimaryKb":"ComarchOptimaAdditionalFunctions","question":"Jakie funkcje dodatkowe dotyczą eksportu XML dokumentów?"},
  {"id":"Q033","category":"additional_functions","expectedPrimaryKb":"ComarchOptimaAdditionalFunctions","question":"Jakie przykłady dotyczą ewidencji dodatkowej?"},
  {"id":"Q034","category":"additional_functions","expectedPrimaryKb":"ComarchOptimaAdditionalFunctions","question":"Jakie ostrzeżenia implementacyjne mamy dla FD?"},
  {"id":"Q035","category":"additional_functions","expectedPrimaryKb":"ComarchOptimaAdditionalFunctions","question":"Które przykłady COM dotyczą księgowości i dekretów?"},
  {"id":"Q036","category":"additional_functions","expectedPrimaryKb":"ComarchOptimaAdditionalFunctions","question":"Czy mam użyć FD czy własnego SQL dla prostego rozszerzenia listy?"},
  {"id":"Q037","category":"additional_functions","expectedPrimaryKb":"ComarchOptimaAdditionalFunctions","question":"Jakie słowniki i komunikaty są związane z funkcjami dodatkowymi?"},
  {"id":"Q038","category":"additional_functions","expectedPrimaryKb":"ComarchOptimaAdditionalFunctions","question":"Jakie przykłady dotyczą importu faktur z XML?"},
  {"id":"Q039","category":"additional_functions","expectedPrimaryKb":"ComarchOptimaAdditionalFunctions","question":"Jakie przykłady dotyczą eksportu dokumentów do XML?"},
  {"id":"Q040","category":"additional_functions","expectedPrimaryKb":"ComarchOptimaAdditionalFunctions","question":"Jak znaleźć funkcję dodatkową do automatyzacji bufora?"},
  {"id":"Q041","category":"additional_functions","expectedPrimaryKb":"ComarchOptimaAdditionalFunctions","question":"Które obiekty schemy są anchorami dla przykładów funkcji dodatkowych?"},
  {"id":"Q042","category":"additional_functions","expectedPrimaryKb":"ComarchOptimaAdditionalFunctions","question":"Jakie COM examples mamy dla wydruków i raportowania?"},
  {"id":"Q043","category":"additional_functions","expectedPrimaryKb":"ComarchOptimaAdditionalFunctions","question":"Jakie przykłady FD dotyczą skanowania dokumentów?"},
  {"id":"Q044","category":"additional_functions","expectedPrimaryKb":"ComarchOptimaAdditionalFunctions","question":"Jakie przykłady FD dotyczą magazynu albo anulowanych dokumentów?"},
  {"id":"Q045","category":"additional_functions","expectedPrimaryKb":"ComarchOptimaAdditionalFunctions","question":"Jak wybrać między FD, COM i kolumną użytkownika dla rozszerzenia listy?"},
  // Sprint
  {"id":"Q047","category":"sprint","expectedPrimaryKb":"ComarchOptimaSprint","question":"Jakie SQL patterny mamy dla Sprint?"},
  {"id":"Q048","category":"sprint","expectedPrimaryKb":"ComarchOptimaSprint","question":"Jak użyć RO_GetReportHeader i RO_GetReportContent?"},
  {"id":"Q049","category":"sprint","expectedPrimaryKb":"ComarchOptimaSprint","question":"Jakie są typowe źródła danych dla wydruków sPrint?"},
  {"id":"Q050","category":"sprint","expectedPrimaryKb":"ComarchOptimaSprint","question":"Jakie są najczęstsze problemy diagnostyczne wydruków?"},
  {"id":"Q051","category":"sprint","expectedPrimaryKb":"ComarchOptimaSprint","question":"Jakie modułowe recipes mamy dla wydruków handlowych?"},
  {"id":"Q052","category":"sprint","expectedPrimaryKb":"ComarchOptimaSprint","question":"Jakie wydruki wyglądają na sPrint według rodzin WDR?"},
  {"id":"Q053","category":"sprint","expectedPrimaryKb":"ComarchOptimaSprint","question":"Jak odróżnić sPrint od GenRap w naszych definicjach?"},
  {"id":"Q054","category":"sprint","expectedPrimaryKb":"ComarchOptimaSprint","question":"Jakie print technology families mamy w Optimie?"},
  {"id":"Q055","category":"sprint","expectedPrimaryKb":"ComarchOptimaSprint","question":"Jak zacząć własne zapytanie SQL do wydruku?"},
  {"id":"Q056","category":"sprint","expectedPrimaryKb":"ComarchOptimaSprint","question":"Jakie parametry dynamiczne pojawiają się w wydrukach?"},
  {"id":"Q057","category":"sprint","expectedPrimaryKb":"ComarchOptimaSprint","question":"Jakie wzorce mamy dla agregacji pozycji na wydruku?"},
  {"id":"Q058","category":"sprint","expectedPrimaryKb":"ComarchOptimaSprint","question":"Jak znaleźć wydruki dotyczące rejestrów VAT?"},
  {"id":"Q059","category":"sprint","expectedPrimaryKb":"ComarchOptimaSprint","question":"Jak znaleźć wydruki dotyczące dokumentów handlowych?"},
  {"id":"Q060","category":"sprint","expectedPrimaryKb":"ComarchOptimaSprint","question":"Jakie artefakty Sprint mamy dziś jako najbardziej praktyczne?"},
  // Reference
  {"id":"Q062","category":"reference","expectedPrimaryKb":"ComarchOptimaReference","question":"Jak zacząć pracę z oficjalną dokumentacją Optimy?"},
  {"id":"Q063","category":"reference","expectedPrimaryKb":"ComarchOptimaReference","question":"Gdzie szukać oficjalnych instrukcji o aktualizacjach?"},
  {"id":"Q064","category":"reference","expectedPrimaryKb":"ComarchOptimaReference","question":"Gdzie w dokumentacji są szkolenia i onboarding?"},
  {"id":"Q065","category":"reference","expectedPrimaryKb":"ComarchOptimaReference","question":"Jak znaleźć oficjalne info o kolumnach użytkownika?"},
  {"id":"Q066","category":"reference","expectedPrimaryKb":"ComarchOptimaReference","question":"Gdzie w dokumentacji jest strojenie MSSQL dla Optimy?"},
  {"id":"Q067","category":"reference","expectedPrimaryKb":"ComarchOptimaReference","question":"Jak znaleźć oficjalne artykuły dla Internetowej Wymiany Dokumentów?"},
  {"id":"Q068","category":"reference","expectedPrimaryKb":"ComarchOptimaReference","question":"Gdzie szukać ogólnej dokumentacji modułów Optimy?"},
  {"id":"Q069","category":"reference","expectedPrimaryKb":"ComarchOptimaReference","question":"Która KB powinna być pierwszym wejściem przy niejasnym pytaniu o Optimę?"},
  {"id":"Q070","category":"reference","expectedPrimaryKb":"ComarchOptimaReference","question":"Gdzie w dokumentacji znajdę informacje o aktualizacjach po wydaniu wersji?"},
  // Partner
  {"id":"Q072","category":"partner","expectedPrimaryKb":"ComarchOptimaPartnerTechnical","question":"Jakie partnerowe procedury dotyczą wydruków i parametrów dynamicznych?"},
  {"id":"Q073","category":"partner","expectedPrimaryKb":"ComarchOptimaPartnerTechnical","question":"Jakie partnerowe komunikaty mamy dla konfiguracji?"},
  {"id":"Q074","category":"partner","expectedPrimaryKb":"ComarchOptimaPartnerTechnical","question":"Jakie COM sample partnerowe dotyczą logowania?"},
  {"id":"Q075","category":"partner","expectedPrimaryKb":"ComarchOptimaPartnerTechnical","question":"Jakie COM sample partnerowe dotyczą handlu i magazynu?"},
  {"id":"Q076","category":"partner","expectedPrimaryKb":"ComarchOptimaPartnerTechnical","question":"Jakie assety partnerowe są z obszaru XML structures?"},
  {"id":"Q077","category":"partner","expectedPrimaryKb":"ComarchOptimaPartnerTechnical","question":"Jakie makra partnerowe mamy dla księgowości?"},
  {"id":"Q078","category":"partner","expectedPrimaryKb":"ComarchOptimaPartnerTechnical","question":"Jakie pliki pomocnicze partnerowe są istotne dla wydruków?"},
  {"id":"Q079","category":"partner","expectedPrimaryKb":"ComarchOptimaPartnerTechnical","question":"Jakie dictionaries z partnera dotyczą wydruków?"},
  {"id":"Q080","category":"partner","expectedPrimaryKb":"ComarchOptimaPartnerTechnical","question":"Jakie procedures.csv z partnera dotyczą funkcji dodatkowych?"},
  {"id":"Q081","category":"partner","expectedPrimaryKb":"ComarchOptimaPartnerTechnical","question":"Jak znaleźć partnerowy przykład dodatkowej kolumny XML?"},
  {"id":"Q082","category":"partner","expectedPrimaryKb":"ComarchOptimaPartnerTechnical","question":"Jak znaleźć partnerowy przykład procesu dodatkowej akceptacji płatności?"},
  {"id":"Q083","category":"partner","expectedPrimaryKb":"ComarchOptimaPartnerTechnical","question":"Jakie partnerowe recipes COM mamy dla wydruków i raportowania?"},
  {"id":"Q084","category":"partner","expectedPrimaryKb":"ComarchOptimaPartnerTechnical","question":"Jakie partnerowe materiały są unikalne i nie dublują innych KB?"},
  {"id":"Q085","category":"partner","expectedPrimaryKb":"ComarchOptimaPartnerTechnical","question":"Jakie partnerowe materiały dotyczą API KSeF?"},
  // Betterfly
  {"id":"Q086","category":"betterfly","expectedPrimaryKb":"ComarchBetterflyReference","question":"Jak działa token Betterfly API?"},
  {"id":"Q087","category":"betterfly","expectedPrimaryKb":"ComarchBetterflyReference","question":"Które endpointy Betterfly są wersjonowane?"},
  {"id":"Q088","category":"betterfly","expectedPrimaryKb":"ComarchBetterflyReference","question":"Jaka jest różnica między payments i paymentdetails?"},
  {"id":"Q089","category":"betterfly","expectedPrimaryKb":"ComarchBetterflyReference","question":"Jak wygląda Bearer auth w Betterfly?"},
  {"id":"Q090","category":"betterfly","expectedPrimaryKb":"ComarchBetterflyReference","question":"Jakie endpointy dotyczą invoices w Betterfly?"},
  {"id":"Q091","category":"betterfly","expectedPrimaryKb":"ComarchBetterflyReference","question":"Jakie endpointy dotyczą advanceInvoices?"},
  {"id":"Q092","category":"betterfly","expectedPrimaryKb":"ComarchBetterflyReference","question":"Jakie endpointy dotyczą profit margin invoices?"},
  {"id":"Q093","category":"betterfly","expectedPrimaryKb":"ComarchBetterflyReference","question":"Jak modelować create update confirm delete dla Betterfly?"},
  {"id":"Q094","category":"betterfly","expectedPrimaryKb":"ComarchBetterflyReference","question":"Jak wygląda flow finalize dla advance invoice?"},
  {"id":"Q095","category":"betterfly","expectedPrimaryKb":"ComarchBetterflyReference","question":"Jakie są ostrzeżenia przy print endpointach Betterfly?"},
  {"id":"Q096","category":"betterfly","expectedPrimaryKb":"ComarchBetterflyReference","question":"Jakie są family endpointów customers, products, invoices?"},
  {"id":"Q097","category":"betterfly","expectedPrimaryKb":"ComarchBetterflyReference","question":"Jakie są metadata-only notatki kontraktowe dla Betterfly API?"},
  {"id":"Q098","category":"betterfly","expectedPrimaryKb":"ComarchBetterflyReference","question":"Jakie są write-side notes dla Betterfly?"},
  {"id":"Q099","category":"betterfly","expectedPrimaryKb":"ComarchBetterflyReference","question":"Jak wygląda auth error behavior albo envelope shape w Betterfly?"},
  {"id":"Q100","category":"betterfly","expectedPrimaryKb":"ComarchBetterflyReference","question":"Jakie artefakty Betterfly mam sprawdzić, jeśli chcę zrozumieć API bez danych biznesowych?"},
  // Schema
  {"id":"Q101","category":"schema","expectedPrimaryKb":"ComarchOptimaSchema","question":"Jak znaleźć relację dokumentu handlowego do płatnika?"},
  {"id":"Q102","category":"schema","expectedPrimaryKb":"ComarchOptimaSchema","question":"Które obiekty SQL używają Wydruki w bazie konfiguracyjnej?"},
  {"id":"Q103","category":"schema","expectedPrimaryKb":"ComarchOptimaSchema","question":"Jakie procedury raportowe dotykają wydruków handlowych?"},
  {"id":"Q104","category":"schema","expectedPrimaryKb":"ComarchOptimaSchema","question":"Jak znaleźć triggery związane z TraNag?"},
  {"id":"Q105","category":"schema","expectedPrimaryKb":"ComarchOptimaSchema","question":"Które obiekty SQL czytają Towary i Kontrahenci jednocześnie?"},
  {"id":"Q106","category":"schema","expectedPrimaryKb":"ComarchOptimaSchema","question":"Jak wygląda relacja między operatorami, bazami i modułami operatora?"},
  {"id":"Q107","category":"schema","expectedPrimaryKb":"ComarchOptimaSchema","question":"Jak znaleźć procedury i funkcje używające CfgWartosci?"},
  {"id":"Q108","category":"schema","expectedPrimaryKb":"ComarchOptimaSchema","question":"Które tabele konfiguracji są lookup tables?"},
  {"id":"Q109","category":"schema","expectedPrimaryKb":"ComarchOptimaSchema","question":"Jak wygląda ścieżka od dokumentu handlowego do pozycji VAT?"},
  {"id":"Q110","category":"schema","expectedPrimaryKb":"ComarchOptimaSchema","question":"Jak znaleźć procedury związane z GetReportHeader?"},
  {"id":"Q111","category":"schema","expectedPrimaryKb":"ComarchOptimaSchema","question":"Które funkcje używają BnkZapisy albo raportów kasowych?"},
  {"id":"Q112","category":"schema","expectedPrimaryKb":"ComarchOptimaSchema","question":"Jak znaleźć indeksy i klucze na Kontrahenci?"},
  {"id":"Q113","category":"schema","expectedPrimaryKb":"ComarchOptimaSchema","question":"Które obiekty SQL dotykają pracowników i etatów?"},
  {"id":"Q114","category":"schema","expectedPrimaryKb":"ComarchOptimaSchema","question":"Jakie tabele w konfiguracji odpowiadają za klucze i wartości konfiguracji?"},
  {"id":"Q115","category":"schema","expectedPrimaryKb":"ComarchOptimaSchema","question":"Jak znaleźć joiny od TraElem do dokumentu i produktu?"},
  {"id":"Q116","category":"schema","expectedPrimaryKb":"ComarchOptimaSchema","question":"Które procedury dotykają faktur VAT albo korekt?"},
  {"id":"Q117","category":"schema","expectedPrimaryKb":"ComarchOptimaSchema","question":"Jakie obiekty SQL dotykają WdrParametry albo WdrDefinicja?"},
  {"id":"Q118","category":"schema","expectedPrimaryKb":"ComarchOptimaSchema","question":"Jak znaleźć zależności dla CfgKlucze w obiektach SQL?"},
  {"id":"Q119","category":"schema","expectedPrimaryKb":"ComarchOptimaSchema","question":"Jakie tabele i klucze są potrzebne do połączenia dokumentu z towarem i kontrahentem?"},
  {"id":"Q120","category":"schema","expectedPrimaryKb":"ComarchOptimaSchema","question":"Które triggery albo funkcje odnoszą się do Wydruki?"},
  {"id":"Q121","category":"schema","expectedPrimaryKb":"ComarchOptimaSchema","question":"Jak wygląda relacja między raportem bankowym a kontrahentem?"},
  {"id":"Q122","category":"schema","expectedPrimaryKb":"ComarchOptimaSchema","question":"Jak znaleźć obiekty SQL związane z Dekrety albo Konta?"},
  {"id":"Q123","category":"schema","expectedPrimaryKb":"ComarchOptimaSchema","question":"Które tabele i zależności są ważne dla wydruków VAT?"},
  {"id":"Q124","category":"schema","expectedPrimaryKb":"ComarchOptimaSchema","question":"Jak znaleźć wszystkie procedury raportowe z GetReportContent?"},
  {"id":"Q125","category":"schema","expectedPrimaryKb":"ComarchOptimaSchema","question":"Jak znaleźć object dependency do tabel handlowych i konfiguracji jednocześnie?"},
  // Additional Functions
  {"id":"Q126","category":"additional_functions","expectedPrimaryKb":"ComarchOptimaAdditionalFunctions","question":"Jakie przykłady FD dotyczą eksportu PEF?"},
  {"id":"Q127","category":"additional_functions","expectedPrimaryKb":"ComarchOptimaAdditionalFunctions","question":"Jakie przykłady dotyczą importu dokumentów sprzedażowych z XML?"},
  {"id":"Q128","category":"additional_functions","expectedPrimaryKb":"ComarchOptimaAdditionalFunctions","question":"Jakie przykłady dotyczą eksportu dokumentów zakupowych do XML?"},
  {"id":"Q129","category":"additional_functions","expectedPrimaryKb":"ComarchOptimaAdditionalFunctions","question":"Jakie COM examples dotyczą okna postępu albo IE?"},
  {"id":"Q130","category":"additional_functions","expectedPrimaryKb":"ComarchOptimaAdditionalFunctions","question":"Jakie przykłady COM mamy dla wydruków i zmiennych dynamicznych?"},
  {"id":"Q131","category":"additional_functions","expectedPrimaryKb":"ComarchOptimaAdditionalFunctions","question":"Jakie przykłady funkcji dodatkowych dotyczą raportów bankowych?"},
  {"id":"Q132","category":"additional_functions","expectedPrimaryKb":"ComarchOptimaAdditionalFunctions","question":"Które przykłady FD są bardziej SQL niż COM?"},
  {"id":"Q133","category":"additional_functions","expectedPrimaryKb":"ComarchOptimaAdditionalFunctions","question":"Jak znaleźć przykład COM dla operatora albo logowania?"},
  {"id":"Q134","category":"additional_functions","expectedPrimaryKb":"ComarchOptimaAdditionalFunctions","question":"Jakie recipes mamy dla handlu i magazynu w FD?"},
  {"id":"Q135","category":"additional_functions","expectedPrimaryKb":"ComarchOptimaAdditionalFunctions","question":"Jakie recipes mamy dla księgowości i dekretów w FD?"},
  {"id":"Q136","category":"additional_functions","expectedPrimaryKb":"ComarchOptimaAdditionalFunctions","question":"Jakie funkcje dodatkowe dotyczą skanowania albo OCR dokumentów?"},
  {"id":"Q137","category":"additional_functions","expectedPrimaryKb":"ComarchOptimaAdditionalFunctions","question":"Jakie funkcje dotyczą anulowanych dokumentów magazynowych?"},
  {"id":"Q138","category":"additional_functions","expectedPrimaryKb":"ComarchOptimaAdditionalFunctions","question":"Jakie touchpointy do schemy mają przykłady dla TraNag i TraElem?"},
  {"id":"Q139","category":"additional_functions","expectedPrimaryKb":"ComarchOptimaAdditionalFunctions","question":"Jakie przykłady FD dotyczą paragonów?"},
  {"id":"Q140","category":"additional_functions","expectedPrimaryKb":"ComarchOptimaAdditionalFunctions","question":"Jakie przykłady FD dotyczą ewidencji dodatkowej i VAT?"},
  {"id":"Q141","category":"additional_functions","expectedPrimaryKb":"ComarchOptimaAdditionalFunctions","question":"Jakie słowniki partnerowe mogą wspierać funkcje dodatkowe?"},
  {"id":"Q142","category":"additional_functions","expectedPrimaryKb":"ComarchOptimaAdditionalFunctions","question":"Jakie przykłady XML importu i eksportu są już widoczne w FD?"},
  {"id":"Q143","category":"additional_functions","expectedPrimaryKb":"ComarchOptimaAdditionalFunctions","question":"Jakie przykłady dotyczą definicji funkcji dodatkowej jako formularza?"},
  {"id":"Q144","category":"additional_functions","expectedPrimaryKb":"ComarchOptimaAdditionalFunctions","question":"Czy dla rozszerzenia listy handlowej lepsza będzie FD czy kolumna użytkownika?"},
  {"id":"Q145","category":"additional_functions","expectedPrimaryKb":"ComarchOptimaAdditionalFunctions","question":"Jakie przykłady COM mamy dla wydruków, raportów i eksportów?"},
  // Sprint
  {"id":"Q146","category":"sprint","expectedPrimaryKb":"ComarchOptimaSprint","question":"Jakie technologie wydruków widać po rodzinach 1/4/0, 1/3/0, 1/2/3?"},
  {"id":"Q147","category":"sprint","expectedPrimaryKb":"ComarchOptimaSprint","question":"Jak znaleźć wydruki typu GenRap?"},
  {"id":"Q148","category":"sprint","expectedPrimaryKb":"ComarchOptimaSprint","question":"Jak znaleźć wydruki typu sPrint?"},
  {"id":"Q149","category":"sprint","expectedPrimaryKb":"ComarchOptimaSprint","question":"Jakie SQL patterny są dobre dla wydruku z agregacją pozycji?"},
  {"id":"Q150","category":"sprint","expectedPrimaryKb":"ComarchOptimaSprint","question":"Jakie recipes mamy dla wydruków VAT?"},
  {"id":"Q151","category":"sprint","expectedPrimaryKb":"ComarchOptimaSprint","question":"Jakie recipes mamy dla wydruków handlowych z TraNag i TraElem?"},
  {"id":"Q152","category":"sprint","expectedPrimaryKb":"ComarchOptimaSprint","question":"Jakie są różnice między wydrukiem tekstowym a Word/XML według rodzin WDR?"},
  {"id":"Q153","category":"sprint","expectedPrimaryKb":"ComarchOptimaSprint","question":"Jakie wydruki wyglądają na deklaracyjne albo formularzowe?"},
  {"id":"Q154","category":"sprint","expectedPrimaryKb":"ComarchOptimaSprint","question":"Jak znaleźć wydruki dotyczące Rejestr VAT marża?"},
  {"id":"Q155","category":"sprint","expectedPrimaryKb":"ComarchOptimaSprint","question":"Jak znaleźć wydruki dotyczące klasyfikacji zakupów i sprzedaży?"},
  {"id":"Q156","category":"sprint","expectedPrimaryKb":"ComarchOptimaSprint","question":"Jakie patterny mamy dla własnego zapytania SQL w wydruku?"},
  {"id":"Q157","category":"sprint","expectedPrimaryKb":"ComarchOptimaSprint","question":"Jakie diagnozy są typowe dla problemów z parametrami dynamicznymi?"},
  {"id":"Q158","category":"sprint","expectedPrimaryKb":"ComarchOptimaSprint","question":"Jakie schema touchpointy są najważniejsze dla wydruków handlowych?"},
  {"id":"Q159","category":"sprint","expectedPrimaryKb":"ComarchOptimaSprint","question":"Jakie SQL patterny dotyczą nagłówka i pozycji dokumentu?"},
  {"id":"Q160","category":"sprint","expectedPrimaryKb":"ComarchOptimaSprint","question":"Jakie artefakty Sprint najlepiej czytać na start przy nowym wydruku?"},
  // Reference
  {"id":"Q161","category":"reference","expectedPrimaryKb":"ComarchOptimaReference","question":"Gdzie szukać oficjalnej dokumentacji modułu Handel?"},
  {"id":"Q162","category":"reference","expectedPrimaryKb":"ComarchOptimaReference","question":"Jak znaleźć oficjalne info o funkcjach dodatkowych w dokumentacji?"},
  {"id":"Q163","category":"reference","expectedPrimaryKb":"ComarchOptimaReference","question":"Jak znaleźć oficjalne informacje o wydrukach Sprint?"},
  {"id":"Q164","category":"reference","expectedPrimaryKb":"ComarchOptimaReference","question":"Gdzie w dokumentacji są informacje o konfiguracji i administracji?"},
  {"id":"Q165","category":"reference","expectedPrimaryKb":"ComarchOptimaReference","question":"Jak znaleźć oficjalne informacje o szkoleniach e-learningowych?"},
  {"id":"Q166","category":"reference","expectedPrimaryKb":"ComarchOptimaReference","question":"Gdzie szukać oficjalnych wpisów o nowych wersjach i aktualizacjach?"},
  {"id":"Q167","category":"reference","expectedPrimaryKb":"ComarchOptimaReference","question":"Jak znaleźć oficjalny artykuł o strojeniu MSSQL dla Optimy?"},
  {"id":"Q168","category":"reference","expectedPrimaryKb":"ComarchOptimaReference","question":"Gdzie w dokumentacji jest opis IWD?"},
  {"id":"Q169","category":"reference","expectedPrimaryKb":"ComarchOptimaReference","question":"Jak znaleźć oficjalne informacje o kolumnach użytkownika na listach?"},
  {"id":"Q170","category":"reference","expectedPrimaryKb":"ComarchOptimaReference","question":"Która KB jest pierwszym wejściem do oficjalnych pytań o moduły i instrukcje?"},
  // Partner
  {"id":"Q171","category":"partner","expectedPrimaryKb":"ComarchOptimaPartnerTechnical","question":"Jakie partnerowe procedures.csv dotyczą wydruków?"},
  {"id":"Q172","category":"partner","expectedPrimaryKb":"ComarchOptimaPartnerTechnical","question":"Jakie partnerowe messages.csv dotyczą konfiguracji wydruków?"},
  {"id":"Q173","category":"partner","expectedPrimaryKb":"ComarchOptimaAdditionalFunctions","question":"Jakie partnerowe słowniki dotyczą formularza definicji funkcji dodatkowej?"},
  {"id":"Q174","category":"partner","expectedPrimaryKb":"ComarchOptimaPartnerTechnical","question":"Jakie partnerowe materiały XML mamy dla dodatkowej kolumny?"},
  {"id":"Q175","category":"partner","expectedPrimaryKb":"ComarchOptimaPartnerTechnical","question":"Jakie partnerowe COM sample dotyczą wydruków i raportowania?"},
  {"id":"Q176","category":"partner","expectedPrimaryKb":"ComarchOptimaPartnerTechnical","question":"Jakie partnerowe COM sample dotyczą utility i general COM?"},
  {"id":"Q177","category":"partner","expectedPrimaryKb":"ComarchOptimaPartnerTechnical","question":"Jakie partnerowe COM sample dotyczą handlu, magazynu i faktur?"},
  {"id":"Q178","category":"partner","expectedPrimaryKb":"ComarchOptimaPartnerTechnical","question":"Jakie partnerowe assety dotyczą XML structures i helper files?"},
  {"id":"Q179","category":"partner","expectedPrimaryKb":"ComarchOptimaPartnerTechnical","question":"Jakie partnerowe materiały mamy dla makr księgowych?"},
  {"id":"Q180","category":"partner","expectedPrimaryKb":"ComarchOptimaPartnerTechnical","question":"Jakie partnerowe recipes COM pomagają w logowaniu i środowisku uruchomieniowym?"},
  {"id":"Q181","category":"partner","expectedPrimaryKb":"ComarchOptimaPartnerTechnical","question":"Jakie partnerowe procedures albo messages dotyczą funkcji dodatkowych użytkownika?"},
  {"id":"Q182","category":"partner","expectedPrimaryKb":"ComarchOptimaPartnerTechnical","question":"Jak znaleźć partnerowy asset z KSeF API?"},
  {"id":"Q183","category":"partner","expectedPrimaryKb":"ComarchOptimaPartnerTechnical","question":"Jakie partnerowe materiały dotyczą przykładowego procesu dodatkowej akceptacji płatności?"},
  {"id":"Q184","category":"partner","expectedPrimaryKb":"ComarchOptimaPartnerTechnical","question":"Jakie partnerowe source URL warto sprawdzić dla technicznych assetów?"},
  {"id":"Q185","category":"partner","expectedPrimaryKb":"ComarchOptimaPartnerTechnical","question":"Które partnerowe materiały są najlepszym wsparciem dla COM examples?"},
  // Betterfly
  {"id":"Q186","category":"betterfly","expectedPrimaryKb":"ComarchBetterflyReference","question":"Jak pobrać access token z Betterfly API?"},
  {"id":"Q187","category":"betterfly","expectedPrimaryKb":"ComarchBetterflyReference","question":"Jakie wersje endpointów Betterfly występują dla customers i invoices?"},
  {"id":"Q188","category":"betterfly","expectedPrimaryKb":"ComarchBetterflyReference","question":"Jakie API resources Betterfly dotyczą payments?"},
  {"id":"Q189","category":"betterfly","expectedPrimaryKb":"ComarchBetterflyReference","question":"Jakie API patterns mamy dla paymentdetails?"},
  {"id":"Q190","category":"betterfly","expectedPrimaryKb":"ComarchBetterflyReference","question":"Jakie są write-side cautions dla Betterfly?"},
  {"id":"Q191","category":"betterfly","expectedPrimaryKb":"ComarchBetterflyReference","question":"Jak wygląda create/update flow dla dokumentów Betterfly?"},
  {"id":"Q192","category":"betterfly","expectedPrimaryKb":"ComarchBetterflyReference","question":"Jak wygląda confirm flow dla Betterfly API?"},
  {"id":"Q193","category":"betterfly","expectedPrimaryKb":"ComarchBetterflyReference","question":"Jak wygląda correction sequence dla Betterfly?"},
  {"id":"Q194","category":"betterfly","expectedPrimaryKb":"ComarchBetterflyReference","question":"Jak wygląda finalize flow dla advanceInvoices?"},
  {"id":"Q195","category":"betterfly","expectedPrimaryKb":"ComarchBetterflyReference","question":"Jakie ostrzeżenia mamy dla print endpointów Betterfly?"},
  {"id":"Q196","category":"betterfly","expectedPrimaryKb":"ComarchBetterflyReference","question":"Jakie archived API pages mamy dla invoices i payments v1.4?"},
  {"id":"Q197","category":"betterfly","expectedPrimaryKb":"ComarchBetterflyReference","question":"Jakie contract notes mamy dla products i customers?"},
  {"id":"Q198","category":"betterfly","expectedPrimaryKb":"ComarchBetterflyReference","question":"Jakie entry guides mamy dla Betterfly auth i write-side?"},
  {"id":"Q199","category":"betterfly","expectedPrimaryKb":"ComarchBetterflyReference","question":"Jakie learning guides mamy dla Betterfly API usage?"},
  {"id":"Q200","category":"betterfly","expectedPrimaryKb":"ComarchBetterflyReference","question":"Które artefakty Betterfly najlepiej czytać, żeby zrozumieć auth, versioning i write-side?"},
  // Taxbell Accounting VAT
  {"id":"Q201","category":"taxbell_accounting_vat","expectedPrimaryKb":"TaxbellAccountingVATReference","question":"Jakie są obowiązki księgowe związane z przesyłaniem JPK_V7M przy rozliczeniu VAT?"},
  {"id":"Q202","category":"taxbell_accounting_vat","expectedPrimaryKb":"TaxbellAccountingVATReference","question":"Kiedy należy wystawić fakturę korygującą VAT w księgowości i jak wpływa na rozliczenie?"},
  {"id":"Q203","category":"taxbell_accounting_vat","expectedPrimaryKb":"TaxbellAccountingVATReference","question":"Czy deklaracja VAT za miesiąc może być złożona przez KSeF, a jakie są terminy rozliczenia?"},
  {"id":"Q204","category":"taxbell_accounting_vat","expectedPrimaryKb":"TaxbellAccountingVATReference","question":"Jakie elementy musi zawierać faktura VAT zgodna z wymogami KSeF w rachunkowości?"},
  {"id":"Q205","category":"taxbell_accounting_vat","expectedPrimaryKb":"TaxbellAccountingVATReference","question":"Czy przy rozliczeniu VAT od importu towarów księgowość wymaga dodatkowej deklaracji?"},
  {"id":"Q206","category":"taxbell_accounting_vat","expectedPrimaryKb":"TaxbellAccountingVATReference","question":"Jak prawidłowo ująć fakturę zakupu w księgowości, aby była zgodna z przepisami JPK?"},
  {"id":"Q207","category":"taxbell_accounting_vat","expectedPrimaryKb":"TaxbellAccountingVATReference","question":"Jakie są różnice między rozliczeniem VAT miesięcznym a kwartalnym w rachunkowości?"},
  {"id":"Q208","category":"taxbell_accounting_vat","expectedPrimaryKb":"TaxbellAccountingVATReference","question":"Czy w księgowości trzeba przechowywać potwierdzenia nadania deklaracji VAT przez KSeF?"},
  {"id":"Q209","category":"taxbell_accounting_vat","expectedPrimaryKb":"TaxbellAccountingVATReference","question":"Jakie sankcje grożą za nieterminowe rozliczenie VAT i błędne prowadzenie księgowości?"},
  // Taxbell Legal
  {"id":"Q210","category":"taxbell_legal","expectedPrimaryKb":"TaxbellLegalReference","question":"Czy zgodnie z ustawą o CIT mogę odliczyć straty z lat ubiegłych?"},
  {"id":"Q211","category":"taxbell_legal","expectedPrimaryKb":"TaxbellLegalReference","question":"Jaka jest aktualna interpretacja podatkowa dotycząca kosztów uzyskania przychodów w PIT?"},
  {"id":"Q212","category":"taxbell_legal","expectedPrimaryKb":"TaxbellLegalReference","question":"Jakie przepisy prawa podatkowego regulują kwestię amortyzacji środków trwałych?"},
  {"id":"Q213","category":"taxbell_legal","expectedPrimaryKb":"TaxbellLegalReference","question":"Czy kodeks spółek handlowych ma wpływ na rozliczenia CIT?"},
  {"id":"Q214","category":"taxbell_legal","expectedPrimaryKb":"TaxbellLegalReference","question":"Jaka jest stawka podatku PIT dla dochodów z najmu?"},
  {"id":"Q215","category":"taxbell_legal","expectedPrimaryKb":"TaxbellLegalReference","question":"Gdzie znajdę interpretację podatkową dotyczącą ulgi badawczo-rozwojowej w CIT?"},
  {"id":"Q216","category":"taxbell_legal","expectedPrimaryKb":"TaxbellLegalReference","question":"Czy ustawa o podatku dochodowym od osób prawnych przewiduje zwolnienia dla fundacji?"},
  {"id":"Q217","category":"taxbell_legal","expectedPrimaryKb":"TaxbellLegalReference","question":"Jakie dokumenty są wymagane przez prawo podatkowe przy składaniu zeznania CIT-8?"},
  {"id":"Q218","category":"taxbell_legal","expectedPrimaryKb":"TaxbellLegalReference","question":"Czy istnieje interpretacja podatkowa wyjaśniająca zasady opodatkowania dywidend w PIT?"},
  // Taxbell Payroll HR
  {"id":"Q219","category":"taxbell_payroll_hr","expectedPrimaryKb":"TaxbellPayrollHRReference","question":"Jakie są obowiązki pracodawcy wobec PIP w zakresie wynagrodzeń i składek ZUS?"},
  {"id":"Q220","category":"taxbell_payroll_hr","expectedPrimaryKb":"TaxbellPayrollHRReference","question":"Kiedy pracownik ma prawo do urlopu wypoczynkowego i jak naliczać wynagrodzenie za ten urlop?"},
  {"id":"Q221","category":"taxbell_payroll_hr","expectedPrimaryKb":"TaxbellPayrollHRReference","question":"Jakie składki ZUS powinny być potrącane z wynagrodzenia pracownika w 2026 roku?"},
  {"id":"Q222","category":"taxbell_payroll_hr","expectedPrimaryKb":"TaxbellPayrollHRReference","question":"Czy PIP może kontrolować dokumentację kadrową i płacową firmy?"},
  {"id":"Q223","category":"taxbell_payroll_hr","expectedPrimaryKb":"TaxbellPayrollHRReference","question":"Jak prawidłowo obliczyć wynagrodzenie chorobowe i jakie składki ZUS od niego odprowadzić?"},
  {"id":"Q224","category":"taxbell_payroll_hr","expectedPrimaryKb":"TaxbellPayrollHRReference","question":"Jakie są limity potrąceń z wynagrodzenia pracownika według przepisów kadrowych i ZUS?"},
  {"id":"Q225","category":"taxbell_payroll_hr","expectedPrimaryKb":"TaxbellPayrollHRReference","question":"Czy pracodawca musi zgłaszać nowego pracownika do ZUS przed rozpoczęciem pracy?"},
  {"id":"Q226","category":"taxbell_payroll_hr","expectedPrimaryKb":"TaxbellPayrollHRReference","question":"Jakie obowiązki HR ma firma wobec PIP w zakresie bhp i wynagrodzeń?"},
  {"id":"Q227","category":"taxbell_payroll_hr","expectedPrimaryKb":"TaxbellPayrollHRReference","question":"Jaka jest różnica między składką emerytalną a rentową w kontekście wynagrodzenia pracownika?"},
  // Taxbell Accounting VAT
  {"id":"Q228","category":"taxbell_accounting_vat","expectedPrimaryKb":"TaxbellAccountingVATReference","question":"Jakie obowiązki sprawozdawcze w zakresie JPK_VAT ciążą na przedsiębiorcy?"},
  {"id":"Q229","category":"taxbell_accounting_vat","expectedPrimaryKb":"TaxbellAccountingVATReference","question":"Jak JPK wpływa na obowiązki sprawozdawcze w zakresie podatku VAT?"},
  // Taxbell Legal
  {"id":"Q230","category":"taxbell_legal","expectedPrimaryKb":"TaxbellLegalReference","question":"Jakie są powiązania między obowiązkami wynikającymi z MDR w ustawie o CIT a regulacjami dotyczącymi sprawozdawczości i jawności w kodeksie spółek handlowych?"},
  {"id":"Q231","category":"community_news","expectedPrimaryKb":"ComarchCommunityNews","question":"Czy są aktualności społeczności Comarch o planowanej przerwie technicznej?"},
  {"id":"Q232","category":"community_news","expectedPrimaryKb":"ComarchCommunityNews","question":"Jakie publiczne aktualności Comarch mówią o nowej wersji?"},
  {"id":"Q233","category":"business_semantics","expectedPrimaryKb":"ComarchOptimaBusinessSemantics","question":"Co oznacza typ dokumentu i dopuszczalne wartości kodu w Optimie?"},
  {"id":"Q234","category":"business_semantics","expectedPrimaryKb":"ComarchOptimaBusinessSemantics","question":"Jakie jest znaczenie kodu typu dokumentu w domenie biznesowej Optimy?"},
  {"id":"Q235","category":"community_news","expectedPrimaryKb":"ComarchCommunityNews","question":"Jakie są najnowsze aktualności i ogłoszenia ze społeczności Comarch?"},
  {"id":"Q236","category":"community_news","expectedPrimaryKb":"ComarchCommunityNews","question":"Gdzie znajdę bazę wiedzy z ogłoszeniami o wydarzeniach społeczności?"},
  {"id":"Q237","category":"community_news","expectedPrimaryKb":"ComarchCommunityNews","question":"Czy w aktualnościach społeczności pojawiły się nowe informacje o wydarzeniach?"},
  {"id":"Q238","category":"community_news","expectedPrimaryKb":"ComarchCommunityNews","question":"Jakie ogłoszenia dotyczące bazy wiedzy opublikowano dla społeczności?"},
  {"id":"Q239","category":"community_news","expectedPrimaryKb":"ComarchCommunityNews","question":"Gdzie mogę znaleźć aktualności i ogłoszenia o nadchodzących wydarzeniach?"},
  {"id":"Q240","category":"community_news","expectedPrimaryKb":"ComarchCommunityNews","question":"Czy społeczność Comarch ma bazę wiedzy z informacjami o aktualnościach?"},
  {"id":"Q241","category":"community_news","expectedPrimaryKb":"ComarchCommunityNews","question":"Jakie wydarzenia w społeczności są ogłaszane w aktualnościach?"},
  {"id":"Q242","category":"community_news","expectedPrimaryKb":"ComarchCommunityNews","question":"Gdzie publikowane są ogłoszenia i aktualności dla społeczności Comarch?"},
  {"id":"Q243","category":"business_semantics","expectedPrimaryKb":"ComarchOptimaBusinessSemantics","question":"Jakie mapowanie kodów na etykiety jest zdefiniowane dla typu dokumentu 'FZ' w systemie Optima?"},
  {"id":"Q244","category":"business_semantics","expectedPrimaryKb":"ComarchOptimaBusinessSemantics","question":"Które reguły walidacyjne obowiązują dla procesu zatwierdzania faktury zakupu w Optima?"},
  {"id":"Q245","category":"business_semantics","expectedPrimaryKb":"ComarchOptimaBusinessSemantics","question":"Jakie opisy biznesowe są przypisane do kodu statusu 'OTW' w słowniku zamówień?"},
  {"id":"Q246","category":"business_semantics","expectedPrimaryKb":"ComarchOptimaBusinessSemantics","question":"Do jakiej klasyfikacji domenowej należy operacja 'Przelew wewnętrzny' w systemie Optima?"},
  {"id":"Q247","category":"business_semantics","expectedPrimaryKb":"ComarchOptimaBusinessSemantics","question":"Jakie są wymagane walidacje biznesowe dla wprowadzania nowego kontrahenta w ERP Optima?"},
  {"id":"Q248","category":"business_semantics","expectedPrimaryKb":"ComarchOptimaBusinessSemantics","question":"Co oznacza kod 'VAT-ZW' w słowniku stawek podatku VAT dla dokumentów sprzedaży?"},
  {"id":"Q249","category":"business_semantics","expectedPrimaryKb":"ComarchOptimaBusinessSemantics","question":"Jaki jest domyślny opis biznesowy dla atrybutu 'Kraj pochodzenia' w kontekście towaru?"},
  {"id":"Q250","category":"business_semantics","expectedPrimaryKb":"ComarchOptimaBusinessSemantics","question":"Czy istnieją reguły walidacyjne dotyczące daty w dokumencie magazynowym Wydanie Zewnętrzne?"},
  // Taxbell Payroll HR
  {"id":"Q251","category":"taxbell_payroll_hr","expectedPrimaryKb":"TaxbellPayrollHRReference","question":"Jakie są obowiązki pracodawcy wobec PIP w zakresie kontroli przestrzegania przepisów BHP?"},
  {"id":"Q252","category":"taxbell_payroll_hr","expectedPrimaryKb":"TaxbellPayrollHRReference","question":"Czy wynagrodzenie chorobowe pracownika podlega składkom ZUS?"},
  {"id":"Q253","category":"taxbell_payroll_hr","expectedPrimaryKb":"TaxbellPayrollHRReference","question":"Jaka jest maksymalna długość urlopu wypoczynkowego dla pracownika zatrudnionego na pełen etat?"},
  {"id":"Q254","category":"taxbell_payroll_hr","expectedPrimaryKb":"TaxbellPayrollHRReference","question":"Kiedy firma ma obowiązek zgłosić pracownika do ZUS?"},
  {"id":"Q255","category":"taxbell_payroll_hr","expectedPrimaryKb":"TaxbellPayrollHRReference","question":"Jakie składki ZUS są finansowane przez pracodawcę, a jakie przez pracownika?"},
];

function evaluate(item, result) {
  const actual = result.answer.primaryKb;
  const evidenceCount = result.answer.evidence.length;
  const topRouteExpected = result.response.topRoutes?.some?.((entry) => entry.primaryKb === item.expectedPrimaryKb);
  const supportContainsExpected = result.answer.supportKbs.includes(item.expectedPrimaryKb);

  if (actual === item.expectedPrimaryKb && evidenceCount > 0) {
    return 'PASS';
  }
  if (
    (actual === item.expectedPrimaryKb && evidenceCount === 0) ||
    supportContainsExpected ||
    topRouteExpected
  ) {
    return 'PARTIAL';
  }
  return 'MISS';
}

function summarize(results) {
  const counts = { PASS: 0, PARTIAL: 0, MISS: 0 };
  const byCategory = new Map();

  for (const row of results) {
    counts[row.status] += 1;
    const bucket = byCategory.get(row.category) || { total: 0, PASS: 0, PARTIAL: 0, MISS: 0 };
    bucket.total += 1;
    bucket[row.status] += 1;
    byCategory.set(row.category, bucket);
  }

  return { counts, byCategory: Object.fromEntries(byCategory) };
}

function buildMarkdownReport(results, summary, size) {
  const lines = [
    `# ERP Knowledge Assistant ${size}Q Test Report`,
    '',
    `Date: \`${new Date().toISOString().slice(0, 10)}\``,
    '',
    '## Summary',
    '',
    `- PASS: \`${summary.counts.PASS}\``,
    `- PARTIAL: \`${summary.counts.PARTIAL}\``,
    `- MISS: \`${summary.counts.MISS}\``,
    '',
    '## By Category',
    '',
  ];

  for (const [category, bucket] of Object.entries(summary.byCategory)) {
    lines.push(`- \`${category}\`: total \`${bucket.total}\`, PASS \`${bucket.PASS}\`, PARTIAL \`${bucket.PARTIAL}\`, MISS \`${bucket.MISS}\``);
  }

  lines.push('', '## Results', '');

  for (const row of results) {
    lines.push(`### ${row.id} ${row.status}`);
    lines.push('');
    lines.push(`- Category: \`${row.category}\``);
    lines.push(`- Expected primary KB: \`${row.expectedPrimaryKb}\``);
    lines.push(`- Actual primary KB: \`${row.actualPrimaryKb}\``);
    if (row.supportKbs.length) {
      lines.push(`- Support KBs: \`${row.supportKbs.join('`, `')}\``);
    }
    lines.push(`- Question: ${row.question}`);
    if (row.evidence.length) {
      lines.push('- Evidence:');
      for (const ev of row.evidence.slice(0, 3)) {
        lines.push(`  - \`${ev.kb}\` -> \`${ev.artifact}\``);
      }
    }
    if (row.notes.length) {
      lines.push(`- Notes: ${row.notes.join('; ')}`);
    }
    lines.push('');
  }

  return lines.join('\n');
}

async function main() {
  const args = process.argv.slice(2);
  const sizeIndex = args.indexOf('--size');
  const sizeArg = sizeIndex >= 0 ? Number(args[sizeIndex + 1]) : 100;
  const size = Number.isFinite(sizeArg) && sizeArg > 0 ? sizeArg : 100;
  const selectedQuestions = ALL_QUESTIONS.slice(0, size);
  const effectiveSize = selectedQuestions.length;
  if (size > ALL_QUESTIONS.length) {
    process.stderr.write(`Requested ${size} questions, only ${ALL_QUESTIONS.length} available; running ${effectiveSize}.\n`);
  }
  const outJson = path.join(ROOT, `docs/reference/ERP_Knowledge_Assistant_${effectiveSize}Q_TestPack.json`);
  const outMd = path.join(ROOT, `docs/reference/ERP_Knowledge_Assistant_${effectiveSize}Q_Report.md`);

  const results = [];
  for (const item of selectedQuestions) {
    const result = await answerQuestion(item.question);
    const status = evaluate(item, result);
    const notes = [];
    if (result.answer.primaryKb !== item.expectedPrimaryKb) {
      notes.push(`primary mismatch`);
    }
    if (!result.answer.evidence.length) {
      notes.push('no evidence');
    }
    if (status === 'MISS') {
      recordLearningGap(item.question, {
        source: 'testpack',
        routedKb: result.answer.primaryKb,
        evidenceCount: result.answer.evidence.length,
        confidence: result.answer.confidence ?? 0,
        externalFallbackUsed: result.answer.externalSearch?.used || false,
        externalResultCount: result.answer.externalSearch?.resultCount || 0,
      });
    }
    results.push({
      ...item,
      status,
      actualPrimaryKb: result.answer.primaryKb,
      supportKbs: result.answer.supportKbs,
      evidence: result.answer.evidence,
      notes,
    });
  }

  const summary = summarize(results);
  const payload = { generatedAt: new Date().toISOString(), requestedSize: size, size: effectiveSize, questionCount: ALL_QUESTIONS.length, summary, results };
  writeFileAtomically(outJson, JSON.stringify(payload, null, 2) + '\n');
  writeFileAtomically(outMd, buildMarkdownReport(results, summary, effectiveSize) + '\n');

  console.log(JSON.stringify(summary, null, 2));
  console.log(`Wrote: ${outJson}`);
  console.log(`Wrote: ${outMd}`);
  if (summary.counts.PARTIAL || summary.counts.MISS) {
    process.exit(1);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
