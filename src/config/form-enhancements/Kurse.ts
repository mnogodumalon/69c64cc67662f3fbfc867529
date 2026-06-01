import type { FormEnhancements } from './types';

export const formEnhancements: FormEnhancements = {
  fieldOrder: [
    'kursname',
    'yoga_stil',
    'niveau',
    'trainer',
    { row: ['startdatum', 'enddatum'], cols: '1fr 1fr' },
    'uhrzeit',
    'dauer_minuten',
    'raum',
    'max_teilnehmer',
    'kursgebuehr',
    'wochentag',
    'beschreibung',
  ],
  defaults: {
    'startdatum': { kind: 'today' },
    'enddatum': { kind: 'todayOffset', days: 30 },
    'dauer_minuten': { kind: 'literal', value: 60 },
    'max_teilnehmer': { kind: 'literal', value: 12 },
    'kursgebuehr': { kind: 'literal', value: 15 },
  },
  computed: {},
};

// Build-time-populated field dependencies for MODUS-2 arrow functions in
// `computed`. The sub-agent leaves this empty; scripts/parse-formulas.mjs
// fills it after Step 0 by regex-extracting ctx.* calls from each function
// body. The dialog feeds these into classifyComputed so MODUS-2 entries get
// inline anchors instead of always landing in the aggregate section.
export const computedDeps: Record<string, string[]> = {};

// Build-time-populated applookup (ownKey → lookupKey) pairs found in MODUS-2
// arrow functions. Filled by scripts/parse-formulas.mjs from regex matches
// on `ctx.applookup('x','y')` and `ctx.applookupAny('x','y')`. The dialog
// merges this with MODUS-1 refs extracted at render time, so every numeric
// field the formula pulls from a selected lookup is surfaced as an inline
// hint next to the lookup combobox.
export const computedApplookupRefs: Record<string, {lookupKey: string}[]> = {};
