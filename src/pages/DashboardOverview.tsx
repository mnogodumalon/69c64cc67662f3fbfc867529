import { useDashboardData } from '@/hooks/useDashboardData';
import { enrichKurse, enrichBuchungen } from '@/lib/enrich';
import type { EnrichedKurse, EnrichedBuchungen } from '@/types/enriched';
import type { Mitglieder, Buchungen, Kurse } from '@/types/app';
import { APP_IDS } from '@/types/app';
import { LivingAppsService, createRecordUrl, extractRecordId } from '@/services/livingAppsService';
import { formatDate, formatCurrency, displayMultiLookup } from '@/lib/formatters';
import { AI_PHOTO_SCAN, AI_PHOTO_LOCATION } from '@/config/ai-features';
import { useState, useMemo, useCallback } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { StatCard } from '@/components/StatCard';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import {
  IconAlertCircle, IconTool, IconRefresh, IconCheck,
  IconPlus, IconPencil, IconTrash, IconUsers, IconCalendar,
  IconClock, IconMapPin, IconCurrencyEuro, IconSchool,
  IconChartBar,
} from '@tabler/icons-react';
import {
  RecordOverlay, RecordHeader, RecordKeyFacts, RecordSection,
  RecordField, RecordRelation, RecordAttachments,
  useRecordOverlayStack,
} from '@/components/widgets/RecordView';
import { KurseDialog } from '@/components/dialogs/KurseDialog';
import { BuchungenDialog } from '@/components/dialogs/BuchungenDialog';
import { MitgliederDialog } from '@/components/dialogs/MitgliederDialog';

const APPGROUP_ID = '69c64cc67662f3fbfc867529';
const REPAIR_ENDPOINT = '/claude/build/repair';

const WOCHENTAGE_ORDER = ['montag', 'dienstag', 'mittwoch', 'donnerstag', 'freitag', 'samstag', 'sonntag'];
const WOCHENTAGE_LABELS: Record<string, string> = {
  montag: 'Mo', dienstag: 'Di', mittwoch: 'Mi',
  donnerstag: 'Do', freitag: 'Fr', samstag: 'Sa', sonntag: 'So',
};
const WOCHENTAGE_FULL: Record<string, string> = {
  montag: 'Montag', dienstag: 'Dienstag', mittwoch: 'Mittwoch',
  donnerstag: 'Donnerstag', freitag: 'Freitag', samstag: 'Samstag', sonntag: 'Sonntag',
};

const NIVEAU_COLORS: Record<string, string> = {
  anfaenger: 'bg-green-100 text-green-700',
  fortgeschrittene: 'bg-orange-100 text-orange-700',
  alle: 'bg-blue-100 text-blue-700',
};

const STATUS_COLORS: Record<string, string> = {
  bezahlt: 'bg-green-100 text-green-700',
  ausstehend: 'bg-yellow-100 text-yellow-700',
  storniert: 'bg-red-100 text-red-700',
};

type ActiveTab = 'stundenplan' | 'buchungen' | 'mitglieder';

export default function DashboardOverview() {
  const {
    kurse, mitglieder, buchungen, trainer,
    kurseMap, mitgliederMap, trainerMap,
    loading, error, fetchAll,
  } = useDashboardData();

  const enrichedKurse = enrichKurse(kurse, { trainerMap });
  const enrichedBuchungen = enrichBuchungen(buchungen, { mitgliederMap, kurseMap });

  // Tab state
  const [activeTab, setActiveTab] = useState<ActiveTab>('stundenplan');

  // Filter state
  const [selectedTag, setSelectedTag] = useState<string | null>(null);

  // Kurs dialog
  const [kursDialogOpen, setKursDialogOpen] = useState(false);
  const [editingKurs, setEditingKurs] = useState<EnrichedKurse | null>(null);
  const [deleteKurs, setDeleteKurs] = useState<EnrichedKurse | null>(null);

  // Buchungen dialog
  const [buchungDialogOpen, setBuchungDialogOpen] = useState(false);
  const [editingBuchung, setEditingBuchung] = useState<EnrichedBuchungen | null>(null);
  const [deleteBuchung, setDeleteBuchung] = useState<EnrichedBuchungen | null>(null);
  const [buchungDefaultKursId, setBuchungDefaultKursId] = useState<string | null>(null);

  // Mitglieder dialog
  const [mitgliederDialogOpen, setMitgliederDialogOpen] = useState(false);
  const [editingMitglied, setEditingMitglied] = useState<Mitglieder | null>(null);
  const [deleteMitglied, setDeleteMitglied] = useState<Mitglieder | null>(null);

  // Overlays
  const kursOverlay = useRecordOverlayStack<EnrichedKurse>();
  const buchungOverlay = useRecordOverlayStack<EnrichedBuchungen>();
  const mitgliederOverlay = useRecordOverlayStack<Mitglieder>();

  // Wochenplan: Kurse nach Wochentagen gruppiert
  const kurseByTag = useMemo(() => {
    const map = new Map<string, EnrichedKurse[]>();
    for (const tag of WOCHENTAGE_ORDER) map.set(tag, []);
    for (const k of enrichedKurse) {
      const tage = k.fields.wochentag ?? [];
      for (const t of tage) {
        const key = t && typeof t === 'object' && 'key' in t ? t.key : (t as unknown as string);
        if (map.has(key)) map.get(key)!.push(k);
      }
    }
    // sort by uhrzeit
    for (const [, list] of map) {
      list.sort((a, b) => (a.fields.uhrzeit ?? '').localeCompare(b.fields.uhrzeit ?? ''));
    }
    return map;
  }, [enrichedKurse]);

  // Aktive Tage (mit Kursen)
  const aktiveTage = useMemo(
    () => WOCHENTAGE_ORDER.filter(t => (kurseByTag.get(t)?.length ?? 0) > 0),
    [kurseByTag]
  );

  // Buchungen für einen Kurs
  const buchungenByKurs = useMemo(() => {
    const map = new Map<string, EnrichedBuchungen[]>();
    for (const b of enrichedBuchungen) {
      const id = extractRecordId(b.fields.kurs);
      if (!id) continue;
      if (!map.has(id)) map.set(id, []);
      map.get(id)!.push(b);
    }
    return map;
  }, [enrichedBuchungen]);

  // KPIs
  const totalUmsatz = useMemo(
    () => buchungen.reduce((s, b) => s + (b.fields.betrag ?? 0), 0),
    [buchungen]
  );
  const offeneBuchungen = useMemo(
    () => buchungen.filter(b => b.fields.zahlungsstatus?.key === 'ausstehend' || (b.fields.zahlungsstatus as unknown as string) === 'ausstehend').length,
    [buchungen]
  );
  const bezahltUmsatz = useMemo(
    () => buchungen
      .filter(b => {
        const z = b.fields.zahlungsstatus;
        const key = z && typeof z === 'object' ? z.key : (z as unknown as string | undefined);
        return key === 'bezahlt';
      })
      .reduce((s, b) => s + (b.fields.betrag ?? 0), 0),
    [buchungen]
  );

  // Mitglieder suche
  const [mitgliederSearch, setMitgliederSearch] = useState('');
  const filteredMitglieder = useMemo(() => {
    if (!mitgliederSearch.trim()) return mitglieder;
    const q = mitgliederSearch.toLowerCase();
    return mitglieder.filter(m =>
      `${m.fields.vorname ?? ''} ${m.fields.nachname ?? ''}`.toLowerCase().includes(q) ||
      (m.fields.email ?? '').toLowerCase().includes(q)
    );
  }, [mitglieder, mitgliederSearch]);

  // Buchungen filter
  const [buchungFilter, setBuchungFilter] = useState<string>('alle');
  const filteredBuchungen = useMemo(() => {
    if (buchungFilter === 'alle') return enrichedBuchungen;
    return enrichedBuchungen.filter(b => {
      const key = typeof b.fields.zahlungsstatus === 'object'
        ? b.fields.zahlungsstatus?.key
        : b.fields.zahlungsstatus;
      return key === buchungFilter;
    });
  }, [enrichedBuchungen, buchungFilter]);

  const handleKursCreate = useCallback(async (fields: Kurse['fields']) => {
    await LivingAppsService.createKurseEntry(fields as never);
    fetchAll();
  }, [fetchAll]);

  const handleKursEdit = useCallback(async (fields: Kurse['fields']) => {
    if (!editingKurs) return;
    await LivingAppsService.updateKurseEntry(editingKurs.record_id, fields as never);
    fetchAll();
  }, [editingKurs, fetchAll]);

  const handleKursDelete = useCallback(async () => {
    if (!deleteKurs) return;
    await LivingAppsService.deleteKurseEntry(deleteKurs.record_id);
    setDeleteKurs(null);
    fetchAll();
  }, [deleteKurs, fetchAll]);

  const handleBuchungCreate = useCallback(async (fields: Buchungen['fields']) => {
    await LivingAppsService.createBuchungenEntry(fields as never);
    fetchAll();
  }, [fetchAll]);

  const handleBuchungEdit = useCallback(async (fields: Buchungen['fields']) => {
    if (!editingBuchung) return;
    await LivingAppsService.updateBuchungenEntry(editingBuchung.record_id, fields as never);
    fetchAll();
  }, [editingBuchung, fetchAll]);


  const handleBuchungDelete = useCallback(async () => {
    if (!deleteBuchung) return;
    await LivingAppsService.deleteBuchungenEntry(deleteBuchung.record_id);
    setDeleteBuchung(null);
    fetchAll();
  }, [deleteBuchung, fetchAll]);

  const handleMitgliedCreate = useCallback(async (fields: Mitglieder['fields']) => {
    await LivingAppsService.createMitgliederEntry(fields as never);
    fetchAll();
  }, [fetchAll]);

  const handleMitgliedEdit = useCallback(async (fields: Mitglieder['fields']) => {
    if (!editingMitglied) return;
    await LivingAppsService.updateMitgliederEntry(editingMitglied.record_id, fields as never);
    fetchAll();
  }, [editingMitglied, fetchAll]);

  const handleMitgliedDelete = useCallback(async () => {
    if (!deleteMitglied) return;
    await LivingAppsService.deleteMitgliederEntry(deleteMitglied.record_id);
    setDeleteMitglied(null);
    fetchAll();
  }, [deleteMitglied, fetchAll]);

  if (loading) return <DashboardSkeleton />;
  if (error) return <DashboardError error={error} onRetry={fetchAll} />;

  return (
    <div className="space-y-6">
      {/* KPI Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          title="Kurse"
          value={String(kurse.length)}
          description={`${aktiveTage.length} Tage/Woche`}
          icon={<IconCalendar size={18} className="text-muted-foreground" />}
        />
        <StatCard
          title="Mitglieder"
          value={String(mitglieder.length)}
          description="Aktive Mitglieder"
          icon={<IconUsers size={18} className="text-muted-foreground" />}
        />
        <StatCard
          title="Buchungen"
          value={String(buchungen.length)}
          description={offeneBuchungen > 0 ? `${offeneBuchungen} ausstehend` : 'Alle bezahlt'}
          icon={<IconChartBar size={18} className="text-muted-foreground" />}
        />
        <StatCard
          title="Umsatz (bezahlt)"
          value={bezahltUmsatz > 0 ? formatCurrency(bezahltUmsatz) : '—'}
          description={totalUmsatz > bezahltUmsatz ? `${formatCurrency(totalUmsatz - bezahltUmsatz)} offen` : 'Kein offener Betrag'}
          icon={<IconCurrencyEuro size={18} className="text-muted-foreground" />}
        />
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-1 border-b border-border">
        {([
          { key: 'stundenplan', label: 'Stundenplan' },
          { key: 'buchungen', label: 'Buchungen' },
          { key: 'mitglieder', label: 'Mitglieder' },
        ] as { key: ActiveTab; label: string }[]).map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab.key
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Stundenplan Tab */}
      {activeTab === 'stundenplan' && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setSelectedTag(null)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                  selectedTag === null ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-accent'
                }`}
              >
                Alle Tage
              </button>
              {aktiveTage.map(tag => (
                <button
                  key={tag}
                  onClick={() => setSelectedTag(selectedTag === tag ? null : tag)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                    selectedTag === tag ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-accent'
                  }`}
                >
                  {WOCHENTAGE_FULL[tag]}
                </button>
              ))}
            </div>
            <Button
              size="sm"
              onClick={() => { setEditingKurs(null); setKursDialogOpen(true); }}
            >
              <IconPlus size={14} className="mr-1 shrink-0" />
              <span>Neuer Kurs</span>
            </Button>
          </div>

          {/* Wochenplan Grid */}
          {kurse.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3 rounded-2xl border border-dashed border-border">
              <IconCalendar size={48} className="text-muted-foreground" stroke={1.5} />
              <div className="text-center">
                <p className="font-medium text-foreground">Noch keine Kurse</p>
                <p className="text-sm text-muted-foreground mt-1">Erstelle deinen ersten Kurs</p>
              </div>
              <Button size="sm" onClick={() => { setEditingKurs(null); setKursDialogOpen(true); }}>
                <IconPlus size={14} className="mr-1 shrink-0" />Kurs erstellen
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {WOCHENTAGE_ORDER
                .filter(tag => (selectedTag === null || selectedTag === tag))
                .filter(tag => (kurseByTag.get(tag)?.length ?? 0) > 0)
                .map(tag => (
                  <div key={tag} className="space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                        {WOCHENTAGE_FULL[tag]}
                      </span>
                      <span className="text-xs text-muted-foreground bg-muted rounded-full px-1.5 py-0.5">
                        {kurseByTag.get(tag)?.length}
                      </span>
                    </div>
                    <div className="space-y-2">
                      {kurseByTag.get(tag)?.map(kurs => {
                        const buchungenFuerKurs = buchungenByKurs.get(kurs.record_id) ?? [];
                        const belegung = buchungenFuerKurs.length;
                        const max = kurs.fields.max_teilnehmer ?? 0;
                        const belegungPct = max > 0 ? Math.min(100, Math.round(belegung / max * 100)) : 0;
                        const niveauKey = typeof kurs.fields.niveau === 'object'
                          ? kurs.fields.niveau?.key
                          : kurs.fields.niveau;
                        const stilLabel = typeof kurs.fields.yoga_stil === 'object'
                          ? kurs.fields.yoga_stil?.label
                          : kurs.fields.yoga_stil;

                        return (
                          <div
                            key={kurs.record_id}
                            onClick={() => kursOverlay.replace(kurs)}
                            className="rounded-2xl border border-border bg-card p-3 cursor-pointer hover:border-primary/40 hover:shadow-sm transition-all group overflow-hidden"
                          >
                            <div className="flex items-start justify-between gap-2 min-w-0">
                              <div className="min-w-0 flex-1">
                                <p className="font-semibold text-sm text-foreground truncate">
                                  {kurs.fields.kursname ?? 'Unbenannter Kurs'}
                                </p>
                                {stilLabel && (
                                  <p className="text-xs text-muted-foreground truncate">{stilLabel}</p>
                                )}
                              </div>
                              <div className="flex gap-1 shrink-0">
                                <button
                                  onClick={e => { e.stopPropagation(); setEditingKurs(kurs); setKursDialogOpen(true); }}
                                  className="p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                                >
                                  <IconPencil size={14} />
                                </button>
                                <button
                                  onClick={e => { e.stopPropagation(); setDeleteKurs(kurs); }}
                                  className="p-1 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                                >
                                  <IconTrash size={14} />
                                </button>
                              </div>
                            </div>

                            <div className="mt-2 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                              {kurs.fields.uhrzeit && (
                                <span className="flex items-center gap-1">
                                  <IconClock size={12} className="shrink-0" />
                                  {kurs.fields.uhrzeit}
                                  {kurs.fields.dauer_minuten ? ` (${kurs.fields.dauer_minuten} Min.)` : ''}
                                </span>
                              )}
                              {kurs.fields.raum && (
                                <span className="flex items-center gap-1">
                                  <IconMapPin size={12} className="shrink-0" />
                                  <span className="truncate max-w-[80px]">{kurs.fields.raum}</span>
                                </span>
                              )}
                            </div>

                            {kurs.trainerName && (
                              <p className="mt-1.5 text-xs text-muted-foreground flex items-center gap-1">
                                <IconSchool size={12} className="shrink-0" />
                                <span className="truncate">{kurs.trainerName}</span>
                              </p>
                            )}

                            {niveauKey && (
                              <div className="mt-2">
                                <span className={`inline-flex text-xs px-2 py-0.5 rounded-full font-medium ${NIVEAU_COLORS[niveauKey] ?? 'bg-muted text-muted-foreground'}`}>
                                  {kurs.fields.niveau?.label ?? niveauKey}
                                </span>
                              </div>
                            )}

                            {max > 0 && (
                              <div className="mt-2 space-y-1">
                                <div className="flex justify-between text-xs text-muted-foreground">
                                  <span>{belegung}/{max} Plätze</span>
                                  <span>{belegungPct}%</span>
                                </div>
                                <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                                  <div
                                    className={`h-full rounded-full transition-all ${
                                      belegungPct >= 90 ? 'bg-red-500' :
                                      belegungPct >= 70 ? 'bg-orange-400' :
                                      'bg-green-500'
                                    }`}
                                    style={{ width: `${belegungPct}%` }}
                                  />
                                </div>
                              </div>
                            )}

                            <div className="mt-2 flex items-center justify-between">
                              {kurs.fields.kursgebuehr != null && (
                                <span className="text-xs font-semibold text-foreground">
                                  {formatCurrency(kurs.fields.kursgebuehr)}
                                </span>
                              )}
                              <button
                                onClick={e => {
                                  e.stopPropagation();
                                  setBuchungDefaultKursId(kurs.record_id);
                                  setEditingBuchung(null);
                                  setBuchungDialogOpen(true);
                                }}
                                className="ml-auto text-xs text-primary hover:underline flex items-center gap-0.5"
                              >
                                <IconPlus size={12} />Buchung
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
            </div>
          )}
        </div>
      )}

      {/* Buchungen Tab */}
      {activeTab === 'buchungen' && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap gap-2">
              {['alle', 'bezahlt', 'ausstehend', 'storniert'].map(f => (
                <button
                  key={f}
                  onClick={() => setBuchungFilter(f)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium capitalize transition-colors ${
                    buchungFilter === f ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-accent'
                  }`}
                >
                  {f === 'alle' ? 'Alle' :
                   f === 'bezahlt' ? 'Bezahlt' :
                   f === 'ausstehend' ? 'Ausstehend' : 'Storniert'}
                </button>
              ))}
            </div>
            <Button
              size="sm"
              onClick={() => { setEditingBuchung(null); setBuchungDefaultKursId(null); setBuchungDialogOpen(true); }}
            >
              <IconPlus size={14} className="mr-1 shrink-0" />
              <span>Neue Buchung</span>
            </Button>
          </div>

          {filteredBuchungen.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3 rounded-2xl border border-dashed border-border">
              <IconChartBar size={48} className="text-muted-foreground" stroke={1.5} />
              <p className="text-sm text-muted-foreground">Keine Buchungen gefunden</p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-2xl border border-border">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/40">
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Mitglied</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden md:table-cell">Kurs</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden sm:table-cell">Datum</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Status</th>
                    <th className="text-right px-4 py-3 font-medium text-muted-foreground hidden sm:table-cell">Betrag</th>
                    <th className="px-4 py-3 w-20"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredBuchungen.map(b => {
                    const statusKey = typeof b.fields.zahlungsstatus === 'object'
                      ? b.fields.zahlungsstatus?.key
                      : (b.fields.zahlungsstatus as unknown as string | undefined);
                    const statusLabel = typeof b.fields.zahlungsstatus === 'object'
                      ? b.fields.zahlungsstatus?.label
                      : b.fields.zahlungsstatus;

                    return (
                      <tr
                        key={b.record_id}
                        onClick={() => buchungOverlay.replace(b)}
                        className="hover:bg-muted/30 cursor-pointer transition-colors"
                      >
                        <td className="px-4 py-3">
                          <span className="font-medium">{b.mitgliedName || '—'}</span>
                        </td>
                        <td className="px-4 py-3 hidden md:table-cell text-muted-foreground truncate max-w-[160px]">
                          {b.kursName || '—'}
                        </td>
                        <td className="px-4 py-3 hidden sm:table-cell text-muted-foreground">
                          {formatDate(b.fields.buchungsdatum)}
                        </td>
                        <td className="px-4 py-3">
                          {statusKey && (
                            <span className={`inline-flex text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[statusKey] ?? 'bg-muted text-muted-foreground'}`}>
                              {statusLabel ?? statusKey}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 hidden sm:table-cell text-right font-medium">
                          {b.fields.betrag != null ? formatCurrency(b.fields.betrag) : '—'}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex justify-end gap-1">
                            <button
                              onClick={e => { e.stopPropagation(); setEditingBuchung(b); setBuchungDialogOpen(true); }}
                              className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                            >
                              <IconPencil size={14} />
                            </button>
                            <button
                              onClick={e => { e.stopPropagation(); setDeleteBuchung(b); }}
                              className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                            >
                              <IconTrash size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Mitglieder Tab */}
      {activeTab === 'mitglieder' && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <input
              type="text"
              placeholder="Mitglied suchen…"
              value={mitgliederSearch}
              onChange={e => setMitgliederSearch(e.target.value)}
              className="flex-1 min-w-[180px] max-w-xs h-9 px-3 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
            <Button
              size="sm"
              onClick={() => { setEditingMitglied(null); setMitgliederDialogOpen(true); }}
            >
              <IconPlus size={14} className="mr-1 shrink-0" />
              <span>Neues Mitglied</span>
            </Button>
          </div>

          {filteredMitglieder.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3 rounded-2xl border border-dashed border-border">
              <IconUsers size={48} className="text-muted-foreground" stroke={1.5} />
              <p className="text-sm text-muted-foreground">
                {mitgliederSearch ? 'Keine Mitglieder gefunden' : 'Noch keine Mitglieder'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
              {filteredMitglieder.map(m => {
                const buchungenFuerMitglied = buchungen.filter(b =>
                  extractRecordId(b.fields.mitglied) === m.record_id
                );
                const typKey = typeof m.fields.mitgliedschaft_typ === 'object'
                  ? m.fields.mitgliedschaft_typ?.key
                  : (m.fields.mitgliedschaft_typ as unknown as string | undefined);
                const typLabel = typeof m.fields.mitgliedschaft_typ === 'object'
                  ? m.fields.mitgliedschaft_typ?.label
                  : m.fields.mitgliedschaft_typ;

                return (
                  <div
                    key={m.record_id}
                    onClick={() => mitgliederOverlay.replace(m)}
                    className="rounded-2xl border border-border bg-card p-4 cursor-pointer hover:border-primary/40 hover:shadow-sm transition-all overflow-hidden"
                  >
                    <div className="flex items-start justify-between gap-2 min-w-0">
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-foreground truncate">
                          {[m.fields.vorname, m.fields.nachname].filter(Boolean).join(' ') || 'Unbekannt'}
                        </p>
                        {m.fields.email && (
                          <p className="text-xs text-muted-foreground truncate mt-0.5">{m.fields.email}</p>
                        )}
                      </div>
                      <div className="flex gap-1 shrink-0">
                        <button
                          onClick={e => { e.stopPropagation(); setEditingMitglied(m); setMitgliederDialogOpen(true); }}
                          className="p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                        >
                          <IconPencil size={14} />
                        </button>
                        <button
                          onClick={e => { e.stopPropagation(); setDeleteMitglied(m); }}
                          className="p-1 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                        >
                          <IconTrash size={14} />
                        </button>
                      </div>
                    </div>

                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      {typKey && typLabel && (
                        <Badge variant="secondary" className="text-xs">{typLabel}</Badge>
                      )}
                      {m.fields.mitglied_seit && (
                        <span className="text-xs text-muted-foreground">seit {formatDate(m.fields.mitglied_seit)}</span>
                      )}
                    </div>

                    {buchungenFuerMitglied.length > 0 && (
                      <div className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
                        <IconCalendar size={12} className="shrink-0" />
                        <span>{buchungenFuerMitglied.length} Buchung{buchungenFuerMitglied.length !== 1 ? 'en' : ''}</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Kurs Dialog */}
      <KurseDialog
        open={kursDialogOpen}
        onClose={() => { setKursDialogOpen(false); setEditingKurs(null); }}
        onSubmit={editingKurs ? handleKursEdit : handleKursCreate}
        defaultValues={editingKurs?.fields}
        recordId={editingKurs?.record_id}
        trainerList={trainer}
        enablePhotoScan={AI_PHOTO_SCAN['Kurse']}
        enablePhotoLocation={AI_PHOTO_LOCATION['Kurse']}
      />

      {/* Buchung Dialog */}
      <BuchungenDialog
        open={buchungDialogOpen}
        onClose={() => { setBuchungDialogOpen(false); setEditingBuchung(null); setBuchungDefaultKursId(null); }}
        onSubmit={editingBuchung ? handleBuchungEdit : handleBuchungCreate}
        defaultValues={
          editingBuchung
            ? editingBuchung.fields
            : buchungDefaultKursId
              ? { kurs: createRecordUrl(APP_IDS.KURSE, buchungDefaultKursId) }
              : undefined
        }
        recordId={editingBuchung?.record_id}
        mitgliederList={mitglieder}
        kurseList={kurse}
        enablePhotoScan={AI_PHOTO_SCAN['Buchungen']}
        enablePhotoLocation={AI_PHOTO_LOCATION['Buchungen']}
      />

      {/* Mitglieder Dialog */}
      <MitgliederDialog
        open={mitgliederDialogOpen}
        onClose={() => { setMitgliederDialogOpen(false); setEditingMitglied(null); }}
        onSubmit={editingMitglied ? handleMitgliedEdit : handleMitgliedCreate}
        defaultValues={editingMitglied?.fields}
        recordId={editingMitglied?.record_id}
        enablePhotoScan={AI_PHOTO_SCAN['Mitglieder']}
        enablePhotoLocation={AI_PHOTO_LOCATION['Mitglieder']}
      />

      {/* Confirm Dialogs */}
      <ConfirmDialog
        open={!!deleteKurs}
        title="Kurs löschen"
        description={`"${deleteKurs?.fields.kursname ?? 'Kurs'}" wirklich löschen?`}
        onConfirm={handleKursDelete}
        onClose={() => setDeleteKurs(null)}
      />
      <ConfirmDialog
        open={!!deleteBuchung}
        title="Buchung löschen"
        description="Diese Buchung wirklich löschen?"
        onConfirm={handleBuchungDelete}
        onClose={() => setDeleteBuchung(null)}
      />
      <ConfirmDialog
        open={!!deleteMitglied}
        title="Mitglied löschen"
        description={`"${[deleteMitglied?.fields.vorname, deleteMitglied?.fields.nachname].filter(Boolean).join(' ') || 'Mitglied'}" wirklich löschen?`}
        onConfirm={handleMitgliedDelete}
        onClose={() => setDeleteMitglied(null)}
      />

      {/* Record Overlays */}
      <RecordOverlay
        open={!!kursOverlay.top}
        onClose={kursOverlay.close}
        onEdit={() => { setEditingKurs(kursOverlay.top!); kursOverlay.close(); setKursDialogOpen(true); }}
        placement="side"
        size="md"
      >
        {kursOverlay.top && (() => {
          const k = kursOverlay.top;
          const buchungenFuerKurs = buchungenByKurs.get(k.record_id) ?? [];
          return (
            <>
              <RecordHeader
                title={k.fields.kursname ?? 'Kurs'}
                subtitle={k.trainerName || undefined}
                badges={k.fields.yoga_stil ? <Badge variant="secondary">{k.fields.yoga_stil.label}</Badge> : undefined}
              />
              <RecordKeyFacts items={[
                ...(k.fields.uhrzeit ? [{ label: 'Uhrzeit', value: k.fields.uhrzeit + (k.fields.dauer_minuten ? ` (${k.fields.dauer_minuten} Min.)` : '') }] : []),
                ...(k.fields.kursgebuehr != null ? [{ label: 'Gebühr', value: formatCurrency(k.fields.kursgebuehr) }] : []),
                { label: 'Buchungen', value: String(buchungenFuerKurs.length) + (k.fields.max_teilnehmer ? `/${k.fields.max_teilnehmer}` : '') },
              ]} />
              <RecordSection title="Details" cols={2}>
                <RecordField label="Niveau" value={k.fields.niveau} format="pill" hideEmpty />
                <RecordField label="Wochentage" value={displayMultiLookup(k.fields.wochentag)} hideEmpty />
                <RecordField label="Raum" value={k.fields.raum} hideEmpty />
                <RecordField label="Startdatum" value={k.fields.startdatum} format="date" hideEmpty />
                <RecordField label="Enddatum" value={k.fields.enddatum} format="date" hideEmpty />
                <RecordField label="Max. Teilnehmer" value={k.fields.max_teilnehmer != null ? String(k.fields.max_teilnehmer) : undefined} hideEmpty />
                <RecordField label="Beschreibung" value={k.fields.beschreibung} format="longtext" hideEmpty className="md:col-span-2" />
              </RecordSection>
              {buchungenFuerKurs.length > 0 && (
                <RecordSection title="Buchungen">
                  {buchungenFuerKurs.slice(0, 5).map(b => (
                    <RecordRelation
                      key={b.record_id}
                      label="Buchung"
                      name={b.mitgliedName || 'Unbekannt'}
                      meta={b.fields.zahlungsstatus?.label ?? '—'}
                      onClick={() => { kursOverlay.close(); buchungOverlay.replace(b); }}
                    />
                  ))}
                  {buchungenFuerKurs.length > 5 && (
                    <p className="text-xs text-muted-foreground">+{buchungenFuerKurs.length - 5} weitere</p>
                  )}
                </RecordSection>
              )}
              <RecordAttachments appId={APP_IDS.KURSE} recordId={k.record_id} />
            </>
          );
        })()}
      </RecordOverlay>

      <RecordOverlay
        open={!!buchungOverlay.top}
        onClose={buchungOverlay.close}
        onEdit={() => { setEditingBuchung(buchungOverlay.top!); buchungOverlay.close(); setBuchungDialogOpen(true); }}
        placement="side"
        size="md"
      >
        {buchungOverlay.top && (() => {
          const b = buchungOverlay.top;
          const statusKey = typeof b.fields.zahlungsstatus === 'object'
            ? b.fields.zahlungsstatus?.key
            : b.fields.zahlungsstatus as string | undefined;
          return (
            <>
              <RecordHeader
                title={b.mitgliedName || 'Buchung'}
                subtitle={b.kursName || undefined}
                badges={statusKey ? (
                  <Badge className={STATUS_COLORS[statusKey] ?? ''}>
                    {b.fields.zahlungsstatus?.label ?? statusKey}
                  </Badge>
                ) : undefined}
              />
              <RecordKeyFacts items={[
                ...(b.fields.betrag != null ? [{ label: 'Betrag', value: formatCurrency(b.fields.betrag) }] : []),
                ...(b.fields.buchungsdatum ? [{ label: 'Datum', value: formatDate(b.fields.buchungsdatum) }] : []),
              ]} />
              <RecordSection title="Details" cols={2}>
                <RecordField label="Zahlungsart" value={b.fields.zahlungsart} format="pill" hideEmpty />
                <RecordField label="Anmerkungen" value={b.fields.anmerkungen} format="longtext" hideEmpty className="md:col-span-2" />
              </RecordSection>
              <RecordAttachments appId={APP_IDS.BUCHUNGEN} recordId={b.record_id} />
            </>
          );
        })()}
      </RecordOverlay>

      <RecordOverlay
        open={!!mitgliederOverlay.top}
        onClose={mitgliederOverlay.close}
        onEdit={() => { setEditingMitglied(mitgliederOverlay.top!); mitgliederOverlay.close(); setMitgliederDialogOpen(true); }}
        placement="side"
        size="md"
      >
        {mitgliederOverlay.top && (() => {
          const m = mitgliederOverlay.top;
          const buchungenFuerMitglied = enrichedBuchungen.filter(b =>
            extractRecordId(b.fields.mitglied) === m.record_id
          );
          return (
            <>
              <RecordHeader
                title={[m.fields.vorname, m.fields.nachname].filter(Boolean).join(' ') || 'Mitglied'}
                subtitle={m.fields.email}
              />
              <RecordKeyFacts items={[
                { label: 'Buchungen', value: String(buchungenFuerMitglied.length) },
                ...(m.fields.mitglied_seit ? [{ label: 'Mitglied seit', value: formatDate(m.fields.mitglied_seit) }] : []),
                ...(m.fields.mitgliedschaft_typ ? [{ label: 'Mitgliedschaft', value: m.fields.mitgliedschaft_typ.label ?? '' }] : []),
              ]} />
              <RecordSection title="Kontakt" cols={2}>
                <RecordField label="Telefon" value={m.fields.telefon} hideEmpty />
                <RecordField label="Geschlecht" value={m.fields.geschlecht} format="pill" hideEmpty />
                <RecordField label="Geburtsdatum" value={m.fields.geburtsdatum} format="date" hideEmpty />
                <RecordField label="Adresse" value={
                  [m.fields.strasse, m.fields.hausnummer, m.fields.postleitzahl, m.fields.stadt]
                    .filter(Boolean).join(' ') || undefined
                } hideEmpty className="md:col-span-2" />
              </RecordSection>
              {(m.fields.gesundheitshinweise || m.fields.notfall_vorname) && (
                <RecordSection title="Gesundheit & Notfall" cols={2}>
                  <RecordField label="Gesundheitliche Hinweise" value={m.fields.gesundheitshinweise} format="longtext" hideEmpty className="md:col-span-2" />
                  <RecordField label="Notfallkontakt" value={
                    [m.fields.notfall_vorname, m.fields.notfall_nachname].filter(Boolean).join(' ') || undefined
                  } hideEmpty />
                  <RecordField label="Notfall-Telefon" value={m.fields.notfall_telefon} hideEmpty />
                </RecordSection>
              )}
              {buchungenFuerMitglied.length > 0 && (
                <RecordSection title="Buchungen">
                  {buchungenFuerMitglied.slice(0, 5).map(b => (
                    <RecordRelation
                      key={b.record_id}
                      label="Buchung"
                      name={b.kursName || 'Kurs'}
                      meta={`${b.fields.zahlungsstatus?.label ?? '—'} · ${formatDate(b.fields.buchungsdatum)}`}
                      onClick={() => { mitgliederOverlay.close(); buchungOverlay.replace(b); }}
                    />
                  ))}
                </RecordSection>
              )}
              <RecordAttachments appId={APP_IDS.MITGLIEDER} recordId={m.record_id} />
            </>
          );
        })()}
      </RecordOverlay>
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-24 rounded-2xl" />)}
      </div>
      <div className="flex gap-4 border-b border-border pb-0">
        {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-8 w-24" />)}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-48 rounded-2xl" />)}
      </div>
    </div>
  );
}

function DashboardError({ error, onRetry }: { error: Error; onRetry: () => void }) {
  const [repairing, setRepairing] = useState(false);
  const [repairStatus, setRepairStatus] = useState('');
  const [repairDone, setRepairDone] = useState(false);
  const [repairFailed, setRepairFailed] = useState(false);

  const handleRepair = async () => {
    setRepairing(true);
    setRepairStatus('Reparatur wird gestartet...');
    setRepairFailed(false);

    const errorContext = JSON.stringify({
      type: 'data_loading',
      message: error.message,
      stack: (error.stack ?? '').split('\n').slice(0, 10).join('\n'),
      url: window.location.href,
    });

    try {
      const resp = await fetch(REPAIR_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ appgroup_id: APPGROUP_ID, error_context: errorContext }),
      });

      if (!resp.ok || !resp.body) {
        setRepairing(false);
        setRepairFailed(true);
        return;
      }

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';
        for (const raw of lines) {
          const line = raw.trim();
          if (!line.startsWith('data: ')) continue;
          const content = line.slice(6);
          if (content.startsWith('[STATUS]')) setRepairStatus(content.replace(/^\[STATUS]\s*/, ''));
          if (content.startsWith('[DONE]')) { setRepairDone(true); setRepairing(false); }
          if (content.startsWith('[ERROR]') && !content.includes('Dashboard-Links')) setRepairFailed(true);
        }
      }
    } catch {
      setRepairing(false);
      setRepairFailed(true);
    }
  };

  if (repairDone) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4">
        <div className="w-12 h-12 rounded-2xl bg-green-500/10 flex items-center justify-center">
          <IconCheck size={22} className="text-green-500" />
        </div>
        <div className="text-center">
          <h3 className="font-semibold text-foreground mb-1">Dashboard repariert</h3>
          <p className="text-sm text-muted-foreground max-w-xs">Das Problem wurde behoben. Bitte laden Sie die Seite neu.</p>
        </div>
        <Button size="sm" onClick={() => window.location.reload()}>
          <IconRefresh size={14} className="mr-1" />Neu laden
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center py-24 gap-4">
      <div className="w-12 h-12 rounded-2xl bg-destructive/10 flex items-center justify-center">
        <IconAlertCircle size={22} className="text-destructive" />
      </div>
      <div className="text-center">
        <h3 className="font-semibold text-foreground mb-1">Fehler beim Laden</h3>
        <p className="text-sm text-muted-foreground max-w-xs">
          {repairing ? repairStatus : error.message}
        </p>
      </div>
      <div className="flex gap-2">
        <Button variant="outline" size="sm" onClick={onRetry} disabled={repairing}>Erneut versuchen</Button>
        <Button size="sm" onClick={handleRepair} disabled={repairing}>
          {repairing
            ? <span className="inline-block w-3.5 h-3.5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin mr-1" />
            : <IconTool size={14} className="mr-1" />}
          {repairing ? 'Reparatur läuft...' : 'Dashboard reparieren'}
        </Button>
      </div>
      {repairFailed && <p className="text-sm text-destructive">Automatische Reparatur fehlgeschlagen.</p>}
    </div>
  );
}
