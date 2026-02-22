# Bug-Fix Workflow

Starte einen Bug-Fix-Workflow fuer: $ARGUMENTS

## Schritte

1. **Branch erstellen**: Erstelle einen neuen Git-Branch `fix/$ARGUMENTS` basierend auf `main`. Nutze kebab-case fuer den Branch-Namen (Leerzeichen und Sonderzeichen ersetzen, kurz und praegnant).

2. **Relevanten Code finden**: Suche im Codebase nach Code, der mit dem Bug zusammenhaengt:
   - Nutze Grep und Glob um relevante Dateien zu finden
   - Pruefe die Route-Struktur unter `app/[locale]/`
   - Pruefe relevante Services in `lib/`
   - Pruefe relevante Komponenten in `components/`
   - Pruefe Zustand Stores in `lib/stores/`
   - Pruefe Supabase-Queries und RLS-Policies falls datenbankbezogen

3. **Problem analysieren**:
   - Lies den relevanten Code gruendlich
   - Identifiziere die Root Cause (nicht nur Symptome behandeln)
   - Pruefe ob das Problem Server- oder Client-seitig ist
   - Achte auf haeufige Fehlerquellen:
     - Server-only Imports in `'use client'` Komponenten
     - Fehlende `organisation_id` Scoping
     - Race Conditions bei Realtime-Subscriptions
     - Fehlende oder falsche i18n-Keys
     - Supabase RLS-Policy-Probleme

4. **Fix implementieren**:
   - Minimalen, fokussierten Fix schreiben
   - Keine unnoetige Refactorings oder "Verbesserungen" nebenbei
   - Bestehende Patterns und Konventionen einhalten
   - Sicherheitsluecken vermeiden (XSS, SQL Injection, etc.)

5. **Validieren**:
   - `npm run type-check` ausfuehren
   - `npm run lint` ausfuehren
   - Pruefen ob der Build durchgeht: `npm run build`

6. **Zusammenfassung**: Zeige eine kompakte Zusammenfassung:
   - **Bug**: Was war das Problem?
   - **Root Cause**: Warum trat es auf?
   - **Fix**: Was wurde geaendert?
   - **Betroffene Dateien**: Liste aller geaenderten Dateien
   - **Naechste Schritte**:
     - [ ] Manuell im Browser testen
     - [ ] PR erstellen gegen `main`
