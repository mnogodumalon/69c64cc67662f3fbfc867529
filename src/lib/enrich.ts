import type { EnrichedBuchungen, EnrichedKurse } from '@/types/enriched';
import type { Buchungen, Kurse, Mitglieder, Trainer } from '@/types/app';
import { extractRecordId } from '@/services/livingAppsService';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function resolveDisplay(url: unknown, map: Map<string, any>, ...fields: string[]): string {
  if (!url) return '';
  const id = extractRecordId(url);
  if (!id) return '';
  const r = map.get(id);
  if (!r) return '';
  return fields.map(f => String(r.fields[f] ?? '')).join(' ').trim();
}

interface BuchungenMaps {
  mitgliederMap: Map<string, Mitglieder>;
  kurseMap: Map<string, Kurse>;
}

export function enrichBuchungen(
  buchungen: Buchungen[],
  maps: BuchungenMaps
): EnrichedBuchungen[] {
  return buchungen.map(r => ({
    ...r,
    mitgliedName: resolveDisplay(r.fields.mitglied, maps.mitgliederMap, 'vorname', 'nachname'),
    kursName: resolveDisplay(r.fields.kurs, maps.kurseMap, 'kursname'),
  }));
}

interface KurseMaps {
  trainerMap: Map<string, Trainer>;
}

export function enrichKurse(
  kurse: Kurse[],
  maps: KurseMaps
): EnrichedKurse[] {
  return kurse.map(r => ({
    ...r,
    trainerName: resolveDisplay(r.fields.trainer, maps.trainerMap, 'vorname', 'nachname'),
  }));
}
