import type { Buchungen, Kurse } from './app';

export type EnrichedKurse = Kurse & {
  trainerName: string;
};

export type EnrichedBuchungen = Buchungen & {
  mitgliedName: string;
  kursName: string;
};
