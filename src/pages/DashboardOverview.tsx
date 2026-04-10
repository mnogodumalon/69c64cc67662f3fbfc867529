import { useDashboardData } from '@/hooks/useDashboardData';
import { enrichBuchungen, enrichKurse } from '@/lib/enrich';
import type { EnrichedBuchungen, EnrichedKurse } from '@/types/enriched';
import type { Mitglieder, Trainer } from '@/types/app';
import { APP_IDS } from '@/types/app';
import { LivingAppsService, createRecordUrl } from '@/services/livingAppsService';
import { formatDate, formatCurrency } from '@/lib/formatters';
import { useState, useMemo } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { IconAlertCircle, IconTool, IconRefresh, IconCheck, IconPlus, IconPencil, IconTrash, IconCalendar, IconUsers, IconClock, IconMapPin, IconUserCircle, IconChartBar, IconUserPlus, IconChevronRight } from '@tabler/icons-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { StatCard } from '@/components/StatCard';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { KurseDialog } from '@/components/dialogs/KurseDialog';
import { BuchungenDialog } from '@/components/dialogs/BuchungenDialog';
import { AI_PHOTO_SCAN, AI_PHOTO_LOCATION } from '@/config/ai-features';

const APPGROUP_ID = '69c64cc67662f3fbfc867529';
const REPAIR_ENDPOINT = '/claude/build/repair';

const WOCHENTAGE = [
  { key: 'montag', label: 'Mo' },
  { key: 'dienstag', label: 'Di' },
  { key: 'mittwoch', label: 'Mi' },
  { key: 'donnerstag', label: 'Do' },
  { key: 'freitag', label: 'Fr' },
  { key: 'samstag', label: 'Sa' },
  { key: 'sonntag', label: 'So' },
];

const YOGA_STIL_COLORS: Record<string, string> = {
  hatha: 'bg-emerald-500/15 text-emerald-700 border-emerald-200',
  vinyasa: 'bg-violet-500/15 text-violet-700 border-violet-200',
  yin: 'bg-blue-500/15 text-blue-700 border-blue-200',
  ashtanga: 'bg-orange-500/15 text-orange-700 border-orange-200',
  kundalini: 'bg-amber-500/15 text-amber-700 border-amber-200',
  restorative: 'bg-teal-500/15 text-teal-700 border-teal-200',
  power: 'bg-red-500/15 text-red-700 border-red-200',
  bikram: 'bg-rose-500/15 text-rose-700 border-rose-200',
  sonstiges: 'bg-gray-500/15 text-gray-700 border-gray-200',
};

const NIVEAU_BADGE: Record<string, string> = {
  anfaenger: 'bg-green-100 text-green-700',
  fortgeschrittene: 'bg-amber-100 text-amber-700',
  alle: 'bg-sky-100 text-sky-700',
};

export default function DashboardOverview() {
  const {
    mitglieder, buchungen, trainer, kurse,
    mitgliederMap, trainerMap, kurseMap,
    loading, error, fetchAll,
  } = useDashboardData();

  const enrichedBuchungen = enrichBuchungen(buchungen, { mitgliederMap, kurseMap });
  const enrichedKurse = enrichKurse(kurse, { trainerMap });

  // ALL hooks before early returns
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [kursDialogOpen, setKursDialogOpen] = useState(false);
  const [editKurs, setEditKurs] = useState<EnrichedKurse | null>(null);
  const [deleteKursTarget, setDeleteKursTarget] = useState<EnrichedKurse | null>(null);
  const [buchungDialogOpen, setBuchungDialogOpen] = useState(false);
  const [editBuchung, setEditBuchung] = useState<EnrichedBuchungen | null>(null);
  const [deleteBuchungTarget, setDeleteBuchungTarget] = useState<EnrichedBuchungen | null>(null);
  const [prefillKursId, setPrefillKursId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'wochenplan' | 'buchungen'>('wochenplan');

  const kurseByTag = useMemo(() => {
    const map: Record<string, EnrichedKurse[]> = {};
    for (const tag of WOCHENTAGE) {
      map[tag.key] = enrichedKurse.filter(k =>
        k.fields.wochentag?.some(w => w.key === tag.key)
      );
    }
    return map;
  }, [enrichedKurse]);

  const activeWochentage = useMemo(() =>
    WOCHENTAGE.filter(t => (kurseByTag[t.key]?.length ?? 0) > 0),
    [kurseByTag]
  );

  const displayedTag = selectedTag ?? activeWochentage[0]?.key ?? 'montag';

  const kurseForTag = kurseByTag[displayedTag] ?? [];

  const recentBuchungen = useMemo(() =>
    [...enrichedBuchungen].sort((a, b) =>
      (b.fields.buchungsdatum ?? '').localeCompare(a.fields.buchungsdatum ?? '')
    ).slice(0, 20),
    [enrichedBuchungen]
  );

  const umsatzGesamt = useMemo(() =>
    buchungen.reduce((sum, b) => sum + (b.fields.betrag ?? 0), 0),
    [buchungen]
  );

  const offeneBuchungen = useMemo(() =>
    buchungen.filter(b => b.fields.zahlungsstatus?.key === 'ausstehend').length,
    [buchungen]
  );

  if (loading) return <DashboardSkeleton />;
  if (error) return <DashboardError error={error} onRetry={fetchAll} />;

  const handleDeleteKurs = async () => {
    if (!deleteKursTarget) return;
    await LivingAppsService.deleteKurseEntry(deleteKursTarget.record_id);
    setDeleteKursTarget(null);
    fetchAll();
  };

  const handleDeleteBuchung = async () => {
    if (!deleteBuchungTarget) return;
    await LivingAppsService.deleteBuchungenEntry(deleteBuchungTarget.record_id);
    setDeleteBuchungTarget(null);
    fetchAll();
  };

  const openBuchungForKurs = (kurs: EnrichedKurse) => {
    setPrefillKursId(kurs.record_id);
    setEditBuchung(null);
    setBuchungDialogOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* Workflow-Navigation */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <a href="#/intents/mitglied-einschreiben" className="flex items-center gap-4 bg-card border border-border border-l-4 border-l-primary rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow overflow-hidden group">
          <div className="flex-shrink-0 flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10 text-primary">
            <IconUserPlus size={20} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="font-semibold text-foreground truncate">Mitglied einschreiben</div>
            <div className="text-sm text-muted-foreground truncate">Mitglied auswählen und in einen Kurs buchen</div>
          </div>
          <IconChevronRight size={18} className="flex-shrink-0 text-muted-foreground group-hover:text-foreground transition-colors" />
        </a>
        <a href="#/intents/kurs-planen" className="flex items-center gap-4 bg-card border border-border border-l-4 border-l-primary rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow overflow-hidden group">
          <div className="flex-shrink-0 flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10 text-primary">
            <IconCalendar size={20} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="font-semibold text-foreground truncate">Kurs planen</div>
            <div className="text-sm text-muted-foreground truncate">Trainer zuweisen und Teilnehmer verwalten</div>
          </div>
          <IconChevronRight size={18} className="flex-shrink-0 text-muted-foreground group-hover:text-foreground transition-colors" />
        </a>
      </div>
      {/* KPI Zeile */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          title="Mitglieder"
          value={String(mitglieder.length)}
          description="Registriert"
          icon={<IconUsers size={18} className="text-muted-foreground" />}
        />
        <StatCard
          title="Kurse"
          value={String(kurse.length)}
          description="Aktiv"
          icon={<IconCalendar size={18} className="text-muted-foreground" />}
        />
        <StatCard
          title="Buchungen"
          value={String(buchungen.length)}
          description="Gesamt"
          icon={<IconChartBar size={18} className="text-muted-foreground" />}
        />
        <StatCard
          title="Umsatz"
          value={formatCurrency(umsatzGesamt)}
          description={`${offeneBuchungen} offen`}
          icon={<IconUserCircle size={18} className="text-muted-foreground" />}
        />
      </div>

      {/* Tab-Navigation */}
      <div className="flex gap-1 bg-muted/50 p-1 rounded-xl w-fit">
        <button
          onClick={() => setActiveTab('wochenplan')}
          className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${activeTab === 'wochenplan' ? 'bg-background shadow text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
        >
          Wochenplan
        </button>
        <button
          onClick={() => setActiveTab('buchungen')}
          className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${activeTab === 'buchungen' ? 'bg-background shadow text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
        >
          Buchungen
        </button>
      </div>

      {/* Wochenplan */}
      {activeTab === 'wochenplan' && (
        <div className="space-y-4">
          {/* Wochentag-Selektor */}
          <div className="flex items-center gap-2 flex-wrap">
            {WOCHENTAGE.map(tag => {
              const count = kurseByTag[tag.key]?.length ?? 0;
              const isActive = displayedTag === tag.key;
              return (
                <button
                  key={tag.key}
                  onClick={() => setSelectedTag(tag.key)}
                  className={`relative px-3 py-2 rounded-xl text-sm font-semibold transition-all border ${
                    isActive
                      ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                      : count > 0
                        ? 'bg-background text-foreground border-border hover:border-primary/50'
                        : 'bg-muted/30 text-muted-foreground border-border/50'
                  }`}
                >
                  {tag.label}
                  {count > 0 && (
                    <span className={`ml-1.5 text-xs px-1.5 py-0.5 rounded-full ${isActive ? 'bg-primary-foreground/20 text-primary-foreground' : 'bg-primary/10 text-primary'}`}>
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
            <div className="ml-auto">
              <Button
                size="sm"
                onClick={() => { setEditKurs(null); setKursDialogOpen(true); }}
                className="shrink-0"
              >
                <IconPlus size={15} className="mr-1 shrink-0" />
                Kurs anlegen
              </Button>
            </div>
          </div>

          {/* Kurse des gewählten Tages */}
          {kurseForTag.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 border border-dashed border-border rounded-2xl text-center">
              <IconCalendar size={40} className="text-muted-foreground mb-3" stroke={1.5} />
              <p className="text-sm font-medium text-foreground mb-1">Keine Kurse an diesem Tag</p>
              <p className="text-xs text-muted-foreground mb-4">Lege einen neuen Kurs an oder wähle einen anderen Wochentag.</p>
              <Button size="sm" variant="outline" onClick={() => { setEditKurs(null); setKursDialogOpen(true); }}>
                <IconPlus size={14} className="mr-1" />Kurs anlegen
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {kurseForTag.map(kurs => {
                const stilKey = kurs.fields.yoga_stil?.key ?? 'sonstiges';
                const stilColor = YOGA_STIL_COLORS[stilKey] ?? YOGA_STIL_COLORS.sonstiges;
                const niveauKey = kurs.fields.niveau?.key ?? 'alle';
                const niveauColor = NIVEAU_BADGE[niveauKey] ?? NIVEAU_BADGE.alle;
                const buchungenFuerKurs = enrichedBuchungen.filter(b => {
                  const url = b.fields.kurs;
                  return url && url.includes(kurs.record_id);
                });
                const auslastung = kurs.fields.max_teilnehmer
                  ? Math.min(100, Math.round((buchungenFuerKurs.length / kurs.fields.max_teilnehmer) * 100))
                  : null;

                return (
                  <div key={kurs.record_id} className="bg-card border border-border rounded-2xl overflow-hidden flex flex-col">
                    {/* Farbiger Header-Streifen */}
                    <div className={`h-1.5 ${stilKey === 'hatha' ? 'bg-emerald-500' : stilKey === 'vinyasa' ? 'bg-violet-500' : stilKey === 'yin' ? 'bg-blue-500' : stilKey === 'ashtanga' ? 'bg-orange-500' : stilKey === 'kundalini' ? 'bg-amber-500' : stilKey === 'restorative' ? 'bg-teal-500' : stilKey === 'power' ? 'bg-red-500' : stilKey === 'bikram' ? 'bg-rose-500' : 'bg-gray-400'}`} />

                    <div className="p-4 flex flex-col gap-3 flex-1">
                      {/* Kopfzeile */}
                      <div className="flex items-start justify-between gap-2 min-w-0">
                        <div className="min-w-0">
                          <h3 className="font-semibold text-foreground truncate text-base leading-tight">
                            {kurs.fields.kursname ?? '–'}
                          </h3>
                          <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                            <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${stilColor}`}>
                              {kurs.fields.yoga_stil?.label ?? 'Stil'}
                            </span>
                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${niveauColor}`}>
                              {kurs.fields.niveau?.label ?? 'Niveau'}
                            </span>
                          </div>
                        </div>
                        <div className="flex gap-1 shrink-0">
                          <button
                            onClick={() => { setEditKurs(kurs); setKursDialogOpen(true); }}
                            className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                            title="Kurs bearbeiten"
                          >
                            <IconPencil size={15} />
                          </button>
                          <button
                            onClick={() => setDeleteKursTarget(kurs)}
                            className="p-1.5 rounded-lg hover:bg-destructive/10 transition-colors text-muted-foreground hover:text-destructive"
                            title="Kurs löschen"
                          >
                            <IconTrash size={15} />
                          </button>
                        </div>
                      </div>

                      {/* Kursdetails */}
                      <div className="space-y-1.5 text-sm text-muted-foreground">
                        {kurs.fields.uhrzeit && (
                          <div className="flex items-center gap-1.5">
                            <IconClock size={13} className="shrink-0" />
                            <span>{kurs.fields.uhrzeit}{kurs.fields.dauer_minuten ? ` · ${kurs.fields.dauer_minuten} Min.` : ''}</span>
                          </div>
                        )}
                        {kurs.fields.raum && (
                          <div className="flex items-center gap-1.5">
                            <IconMapPin size={13} className="shrink-0" />
                            <span className="truncate">{kurs.fields.raum}</span>
                          </div>
                        )}
                        {kurs.trainerName && (
                          <div className="flex items-center gap-1.5">
                            <IconUserCircle size={13} className="shrink-0" />
                            <span className="truncate">{kurs.trainerName}</span>
                          </div>
                        )}
                      </div>

                      {/* Auslastungsbalken */}
                      {kurs.fields.max_teilnehmer != null && (
                        <div className="space-y-1">
                          <div className="flex justify-between text-xs text-muted-foreground">
                            <span>{buchungenFuerKurs.length} / {kurs.fields.max_teilnehmer} Teilnehmer</span>
                            {auslastung !== null && <span className={auslastung >= 90 ? 'text-red-600 font-medium' : auslastung >= 70 ? 'text-amber-600' : 'text-green-600'}>{auslastung}%</span>}
                          </div>
                          <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all ${auslastung !== null && auslastung >= 90 ? 'bg-red-500' : auslastung !== null && auslastung >= 70 ? 'bg-amber-500' : 'bg-primary'}`}
                              style={{ width: `${auslastung ?? 0}%` }}
                            />
                          </div>
                        </div>
                      )}

                      {/* Footer */}
                      <div className="flex items-center justify-between gap-2 pt-1 mt-auto">
                        {kurs.fields.kursgebuehr != null ? (
                          <span className="text-sm font-semibold text-foreground">{formatCurrency(kurs.fields.kursgebuehr)}</span>
                        ) : <span />}
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-xs h-7"
                          onClick={() => openBuchungForKurs(kurs)}
                        >
                          <IconPlus size={12} className="mr-1 shrink-0" />
                          Buchen
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Buchungen-Tab */}
      {activeTab === 'buchungen' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <h2 className="font-semibold text-foreground">Buchungsübersicht</h2>
            <Button
              size="sm"
              onClick={() => { setEditBuchung(null); setPrefillKursId(null); setBuchungDialogOpen(true); }}
            >
              <IconPlus size={15} className="mr-1 shrink-0" />
              Buchung anlegen
            </Button>
          </div>

          {/* Zahlungsstatus-Summary */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { key: 'ausstehend', label: 'Ausstehend', color: 'text-amber-600 bg-amber-50 border-amber-200' },
              { key: 'bezahlt', label: 'Bezahlt', color: 'text-green-600 bg-green-50 border-green-200' },
              { key: 'storniert', label: 'Storniert', color: 'text-red-600 bg-red-50 border-red-200' },
            ].map(s => {
              const count = buchungen.filter(b => b.fields.zahlungsstatus?.key === s.key).length;
              return (
                <div key={s.key} className={`rounded-xl border p-3 text-center ${s.color}`}>
                  <div className="text-2xl font-bold">{count}</div>
                  <div className="text-xs font-medium mt-0.5">{s.label}</div>
                </div>
              );
            })}
          </div>

          {/* Buchungstabelle */}
          {recentBuchungen.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 border border-dashed border-border rounded-2xl text-center">
              <IconCalendar size={40} className="text-muted-foreground mb-3" stroke={1.5} />
              <p className="text-sm font-medium text-foreground mb-1">Noch keine Buchungen</p>
              <p className="text-xs text-muted-foreground mb-4">Lege die erste Buchung an.</p>
              <Button size="sm" variant="outline" onClick={() => { setEditBuchung(null); setPrefillKursId(null); setBuchungDialogOpen(true); }}>
                <IconPlus size={14} className="mr-1" />Buchung anlegen
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-2xl border border-border">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/30">
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Mitglied</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Kurs</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden sm:table-cell">Datum</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden md:table-cell">Betrag</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Status</th>
                    <th className="px-4 py-3 w-20" />
                  </tr>
                </thead>
                <tbody>
                  {recentBuchungen.map(b => {
                    const statusKey = b.fields.zahlungsstatus?.key ?? '';
                    return (
                      <tr key={b.record_id} className="border-b border-border last:border-0 hover:bg-muted/20 transition-colors">
                        <td className="px-4 py-3">
                          <span className="font-medium text-foreground truncate block max-w-[120px]">
                            {b.mitgliedName ?? '–'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground truncate max-w-[120px]">
                          {b.kursName ?? '–'}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground hidden sm:table-cell whitespace-nowrap">
                          {b.fields.buchungsdatum ? formatDate(b.fields.buchungsdatum) : '–'}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground hidden md:table-cell whitespace-nowrap">
                          {b.fields.betrag != null ? formatCurrency(b.fields.betrag) : '–'}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                            statusKey === 'bezahlt' ? 'bg-green-100 text-green-700' :
                            statusKey === 'ausstehend' ? 'bg-amber-100 text-amber-700' :
                            'bg-red-100 text-red-700'
                          }`}>
                            {b.fields.zahlungsstatus?.label ?? '–'}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex gap-1 justify-end">
                            <button
                              onClick={() => { setEditBuchung(b); setPrefillKursId(null); setBuchungDialogOpen(true); }}
                              className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                            >
                              <IconPencil size={14} />
                            </button>
                            <button
                              onClick={() => setDeleteBuchungTarget(b)}
                              className="p-1.5 rounded-lg hover:bg-destructive/10 transition-colors text-muted-foreground hover:text-destructive"
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

      {/* Dialoge */}
      <KurseDialog
        open={kursDialogOpen}
        onClose={() => { setKursDialogOpen(false); setEditKurs(null); }}
        onSubmit={async (fields) => {
          if (editKurs) {
            await LivingAppsService.updateKurseEntry(editKurs.record_id, fields);
          } else {
            await LivingAppsService.createKurseEntry(fields);
          }
          fetchAll();
        }}
        defaultValues={editKurs?.fields}
        trainerList={trainer}
        enablePhotoScan={AI_PHOTO_SCAN['Kurse']}
        enablePhotoLocation={AI_PHOTO_LOCATION['Kurse']}
      />

      <BuchungenDialog
        open={buchungDialogOpen}
        onClose={() => { setBuchungDialogOpen(false); setEditBuchung(null); setPrefillKursId(null); }}
        onSubmit={async (fields) => {
          if (editBuchung) {
            await LivingAppsService.updateBuchungenEntry(editBuchung.record_id, fields);
          } else {
            await LivingAppsService.createBuchungenEntry(fields);
          }
          fetchAll();
        }}
        defaultValues={
          editBuchung
            ? editBuchung.fields
            : prefillKursId
              ? { kurs: createRecordUrl(APP_IDS.KURSE, prefillKursId) }
              : undefined
        }
        mitgliederList={mitglieder}
        kurseList={kurse}
        enablePhotoScan={AI_PHOTO_SCAN['Buchungen']}
        enablePhotoLocation={AI_PHOTO_LOCATION['Buchungen']}
      />

      <ConfirmDialog
        open={!!deleteKursTarget}
        title="Kurs löschen"
        description={`Möchtest du den Kurs „${deleteKursTarget?.fields.kursname ?? ''}" wirklich löschen?`}
        onConfirm={handleDeleteKurs}
        onClose={() => setDeleteKursTarget(null)}
      />

      <ConfirmDialog
        open={!!deleteBuchungTarget}
        title="Buchung löschen"
        description="Möchtest du diese Buchung wirklich löschen?"
        onConfirm={handleDeleteBuchung}
        onClose={() => setDeleteBuchungTarget(null)}
      />
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-9 w-36" />
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-24 rounded-2xl" />)}
      </div>
      <Skeleton className="h-64 rounded-2xl" />
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
          if (content.startsWith('[STATUS]')) {
            setRepairStatus(content.replace(/^\[STATUS]\s*/, ''));
          }
          if (content.startsWith('[DONE]')) {
            setRepairDone(true);
            setRepairing(false);
          }
          if (content.startsWith('[ERROR]') && !content.includes('Dashboard-Links')) {
            setRepairFailed(true);
          }
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
      {repairFailed && <p className="text-sm text-destructive">Automatische Reparatur fehlgeschlagen. Bitte kontaktieren Sie den Support.</p>}
    </div>
  );
}
