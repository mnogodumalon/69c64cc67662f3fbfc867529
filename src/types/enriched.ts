import type { Buchungen, Kurse } from './app';

export type EnrichedBuchungen = Buchungen & {
  mitgliedName: string;
  kursName: string;
};

export type EnrichedKurse = Kurse & {
  trainerName: string;
};
