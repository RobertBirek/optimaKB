# src — kontekst lokalny

UI dashboardu; transport i operacje KB pozostają w scripts.

- Wybierz moduł z [mapy](../docs/module-map.json); czytaj tylko jego working_set.
- Otwórz właściwą sekcję pamięci operacyjnej, nie cały katalog dokumentacji.
- Sprawdź skutki każdego testu przed uruchomieniem. Testy live nie są testami jednostkowymi.
- Nie zmieniaj runtime data, exports, downloads, sekretów ani plików usług.
- Źródła w działającym checkoutcie są entrypointami systemd; edytuj izolowany checkout.
