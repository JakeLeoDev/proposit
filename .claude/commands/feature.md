# Feature Workflow

Starte einen vollständigen Feature-Workflow fuer: $ARGUMENTS

## Schritte

1. **Branch erstellen**: Erstelle einen neuen Git-Branch `feat/$ARGUMENTS` basierend auf `main`. Nutze kebab-case fuer den Branch-Namen (Leerzeichen und Sonderzeichen ersetzen).

2. **Codebase analysieren**: Untersuche die bestehende Projektstruktur, um zu verstehen, wo das Feature eingebaut werden muss:
   - Pruefe `app/[locale]/(dashboard)/` fuer bestehende Route-Patterns
   - Pruefe `components/` fuer wiederverwendbare UI-Patterns
   - Pruefe `lib/` fuer bestehende Services und Stores
   - Pruefe `lib/types.ts` fuer bestehende Type-Definitionen
   - Pruefe `messages/en.json` und `messages/de.json` fuer i18n-Patterns

3. **Komponenten-Struktur anlegen** (je nach Feature-Typ):

   **Falls neues Entity/CRUD-Feature:**
   - Type-Definition in `lib/types.ts`
   - Service-Klasse in `lib/[entity]-service.ts` (nach bestehendem Pattern)
   - Zustand Store in `lib/stores/[entity].store.ts` (via `createEntityStore`)
   - Server-Page in `app/[locale]/(dashboard)/[entity]/page.tsx`
   - Client-Komponenten mit DataTable/CrudForm aus `components/crud/`
   - i18n-Keys in `messages/en.json` und `messages/de.json`

   **Falls UI-Komponente:**
   - Komponente in `components/` im passenden Unterordner
   - ShadCN UI Primitives aus `components/ui/` nutzen

   **Falls API-Route:**
   - Route in `app/api/` anlegen

4. **Checklist anzeigen**: Zeige am Ende eine Checklist mit naechsten Schritten an:
   - [ ] Feature-Logik implementieren
   - [ ] i18n-Keys in en.json und de.json hinzufuegen
   - [ ] Sidebar-Navigation aktualisieren (falls neue Route)
   - [ ] TypeScript type-check: `npm run type-check`
   - [ ] Linting pruefen: `npm run lint`
   - [ ] Manuell im Browser testen
   - [ ] PR erstellen gegen `main`

## Wichtige Konventionen

- Server-Komponente fuer Auth + Data Fetching, Client-Komponente fuer UI
- Alle Queries nach `organisation_id` scopen (Multi-Tenant)
- British spelling: `organisation`, nicht `organization`
- Sonner Toasts fuer Benachrichtigungen
- `cn()` Helper fuer bedingte Tailwind-Klassen
- Decimal-based Ordering fuer Drag-and-Drop (Luecken von 1000)
