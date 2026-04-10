import { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { IntentWizardShell } from '@/components/IntentWizardShell';
import { EntitySelectStep } from '@/components/EntitySelectStep';
import { StatusBadge } from '@/components/StatusBadge';
import { BudgetTracker } from '@/components/BudgetTracker';
import { KurseDialog } from '@/components/dialogs/KurseDialog';
import { TrainerDialog } from '@/components/dialogs/TrainerDialog';
import { BuchungenDialog } from '@/components/dialogs/BuchungenDialog';
import { LivingAppsService, createRecordUrl, extractRecordId } from '@/services/livingAppsService';
import { useDashboardData } from '@/hooks/useDashboardData';
import { APP_IDS } from '@/types/app';
import type { Kurse, Trainer, Buchungen, Mitglieder } from '@/types/app';
import { formatDate, formatCurrency } from '@/lib/formatters';
import { Button } from '@/components/ui/button';
import {
  IconCalendar,
  IconUsers,
  IconUserCheck,
  IconCheck,
  IconAlertTriangle,
  IconPlus,
  IconChevronRight,
  IconClock,
  IconMapPin,
  IconCurrencyEuro,
  IconStar,
} from '@tabler/icons-react';

const WIZARD_STEPS = [
  { label: 'Kurs' },
  { label: 'Trainer' },
  { label: 'Teilnehmer' },
];

export default function KursPlanenPage() {
  const [searchParams] = useSearchParams();
  const { kurse, trainer, buchungen, mitglieder, loading, error, fetchAll } = useDashboardData();

  // Wizard state
  const initialKursId = searchParams.get('kursId') ?? null;
  const [currentStep, setCurrentStep] = useState(1);
  const [selectedKursId, setSelectedKursId] = useState<string | null>(initialKursId);

  // Dialog states
  const [kurseDialogOpen, setKurseDialogOpen] = useState(false);
  const [trainerDialogOpen, setTrainerDialogOpen] = useState(false);
  const [buchungDialogOpen, setBuchungDialogOpen] = useState(false);

  // Step 2 trainer selection
  const [pendingTrainerId, setPendingTrainerId] = useState<string | null>(null);
  const [assigningTrainer, setAssigningTrainer] = useState(false);

  // Step 3 success state
  const [finished, setFinished] = useState(false);

  // Deep-link: if kursId is in URL, skip to step 2 after data loads
  useEffect(() => {
    if (!loading && initialKursId && selectedKursId === initialKursId) {
      const kursExists = kurse.find(k => k.record_id === initialKursId);
      if (kursExists) {
        setCurrentStep(2);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading]);

  // Derived: selected course
  const selectedKurs: Kurse | undefined = useMemo(
    () => kurse.find(k => k.record_id === selectedKursId),
    [kurse, selectedKursId]
  );

  // Derived: trainer assigned to selected course
  const assignedTrainerId: string | null = useMemo(() => {
    if (!selectedKurs) return null;
    return extractRecordId(selectedKurs.fields.trainer ?? null);
  }, [selectedKurs]);

  const assignedTrainer: Trainer | undefined = useMemo(
    () => (assignedTrainerId ? trainer.find(t => t.record_id === assignedTrainerId) : undefined),
    [trainer, assignedTrainerId]
  );

  // Derived: bookings for selected course
  const kursBookings: Buchungen[] = useMemo(() => {
    if (!selectedKursId) return [];
    return buchungen.filter(b => extractRecordId(b.fields.kurs ?? null) === selectedKursId);
  }, [buchungen, selectedKursId]);

  // Derived: mitglieder map for name resolution
  const mitgliederMap = useMemo(() => {
    const m = new Map<string, Mitglieder>();
    mitglieder.forEach(mg => m.set(mg.record_id, mg));
    return m;
  }, [mitglieder]);

  // Derived: step 3 stats
  const bookingStats = useMemo(() => {
    const total = kursBookings.length;
    const bezahlt = kursBookings.filter(b => b.fields.zahlungsstatus?.key === 'bezahlt').length;
    const ausstehend = kursBookings.filter(
      b => b.fields.zahlungsstatus?.key === 'ausstehend' || !b.fields.zahlungsstatus
    ).length;
    const einnahmen = kursBookings
      .filter(b => b.fields.zahlungsstatus?.key === 'bezahlt')
      .reduce((sum, b) => sum + (b.fields.betrag ?? 0), 0);
    return { total, bezahlt, ausstehend, einnahmen };
  }, [kursBookings]);

  // Booking default values (pre-fill kurs)
  const buchungDefaultValues: Buchungen['fields'] | undefined = useMemo(() => {
    if (!selectedKursId) return undefined;
    return {
      kurs: createRecordUrl(APP_IDS.KURSE, selectedKursId),
    };
  }, [selectedKursId]);

  // Handlers
  function handleKursSelect(id: string) {
    setSelectedKursId(id);
    setCurrentStep(2);
  }

  async function handleAssignTrainer() {
    if (!selectedKursId || !pendingTrainerId) return;
    setAssigningTrainer(true);
    try {
      await LivingAppsService.updateKurseEntry(selectedKursId, {
        trainer: createRecordUrl(APP_IDS.TRAINER, pendingTrainerId),
      });
      await fetchAll();
      setPendingTrainerId(null);
    } finally {
      setAssigningTrainer(false);
    }
  }

  function handleFinish() {
    setFinished(true);
  }

  function handleRestart() {
    setSelectedKursId(null);
    setPendingTrainerId(null);
    setFinished(false);
    setCurrentStep(1);
  }

  // ---- Render helpers ----

  function getTrainerName(t: Trainer) {
    return [t.fields.vorname, t.fields.nachname].filter(Boolean).join(' ') || '(Ohne Name)';
  }

  function getMitgliedName(mitgliedUrl: string | undefined): string {
    if (!mitgliedUrl) return '—';
    const id = extractRecordId(mitgliedUrl);
    if (!id) return '—';
    const mg = mitgliederMap.get(id);
    if (!mg) return '—';
    return [mg.fields.vorname, mg.fields.nachname].filter(Boolean).join(' ') || '—';
  }

  function getKursSubtitle(k: Kurse): string {
    const parts: string[] = [];
    if (k.fields.yoga_stil?.label) parts.push(k.fields.yoga_stil.label);
    if (k.fields.niveau?.label) parts.push(k.fields.niveau.label);
    const wochentage = Array.isArray(k.fields.wochentag)
      ? k.fields.wochentag.map(w => (typeof w === 'object' && 'label' in w ? w.label : String(w))).join(', ')
      : '';
    if (wochentage) parts.push(wochentage);
    if (k.fields.uhrzeit) parts.push(k.fields.uhrzeit);
    if (k.fields.dauer_minuten) parts.push(`${k.fields.dauer_minuten} Min.`);
    return parts.join(' · ') || '—';
  }

  return (
    <IntentWizardShell
      title="Kurs planen & Teilnehmer verwalten"
      subtitle="Wähle einen Kurs, weise einen Trainer zu und verwalte die Buchungen."
      steps={WIZARD_STEPS}
      currentStep={currentStep}
      onStepChange={setCurrentStep}
      loading={loading}
      error={error}
      onRetry={fetchAll}
    >
      {/* ── STEP 1: Kurs auswählen ── */}
      {currentStep === 1 && (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Wähle einen bestehenden Kurs aus oder lege einen neuen an.
          </p>
          <EntitySelectStep
            items={kurse.map(k => {
              const trId = extractRecordId(k.fields.trainer ?? null);
              const tr = trId ? trainer.find(t => t.record_id === trId) : undefined;
              const trName = tr ? getTrainerName(tr) : undefined;
              return {
                id: k.record_id,
                title: k.fields.kursname ?? '(Ohne Name)',
                subtitle: getKursSubtitle(k) + (trName ? ` · Trainer: ${trName}` : ''),
                icon: <IconCalendar size={20} className="text-primary" />,
                stats: [
                  { label: 'Max. Teilnehmer', value: k.fields.max_teilnehmer ?? '—' },
                  { label: 'Gebühr', value: formatCurrency(k.fields.kursgebuehr) },
                  ...(k.fields.raum ? [{ label: 'Raum', value: k.fields.raum }] : []),
                ],
              };
            })}
            onSelect={handleKursSelect}
            searchPlaceholder="Kurs suchen..."
            emptyIcon={<IconCalendar size={40} />}
            emptyText="Noch keine Kurse vorhanden. Erstelle deinen ersten Kurs."
            createLabel="Neuen Kurs anlegen"
            onCreateNew={() => setKurseDialogOpen(true)}
            createDialog={
              <KurseDialog
                open={kurseDialogOpen}
                onClose={() => setKurseDialogOpen(false)}
                onSubmit={async (fields) => {
                  await LivingAppsService.createKurseEntry(fields);
                  await fetchAll();
                  setKurseDialogOpen(false);
                }}
                defaultValues={undefined}
                trainerList={trainer}
                enablePhotoScan={false}
                enablePhotoLocation={false}
              />
            }
          />
        </div>
      )}

      {/* ── STEP 2: Trainer & Kursdetails ── */}
      {currentStep === 2 && selectedKurs && (
        <div className="space-y-5">
          {/* Kurs-Zusammenfassung */}
          <div className="rounded-2xl border bg-card overflow-hidden shadow-sm">
            <div className="p-5">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                  <IconCalendar size={20} className="text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <h2 className="font-semibold text-base truncate">
                    {selectedKurs.fields.kursname ?? '(Ohne Name)'}
                  </h2>
                  <p className="text-sm text-muted-foreground mt-0.5 line-clamp-2">
                    {getKursSubtitle(selectedKurs)}
                  </p>
                </div>
              </div>
              <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
                {selectedKurs.fields.raum && (
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <IconMapPin size={14} className="shrink-0" />
                    <span className="truncate">{selectedKurs.fields.raum}</span>
                  </div>
                )}
                {selectedKurs.fields.uhrzeit && (
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <IconClock size={14} className="shrink-0" />
                    <span>{selectedKurs.fields.uhrzeit}</span>
                  </div>
                )}
                {selectedKurs.fields.max_teilnehmer != null && (
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <IconUsers size={14} className="shrink-0" />
                    <span>Max. {selectedKurs.fields.max_teilnehmer} Teilnehmer</span>
                  </div>
                )}
                {selectedKurs.fields.kursgebuehr != null && (
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <IconCurrencyEuro size={14} className="shrink-0" />
                    <span>{formatCurrency(selectedKurs.fields.kursgebuehr)}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Kurs-Statistiken */}
            <div className="border-t grid grid-cols-3 divide-x">
              <div className="p-3 text-center">
                <p className="text-lg font-bold">{kursBookings.length}</p>
                <p className="text-xs text-muted-foreground">Buchungen</p>
              </div>
              <div className="p-3 text-center">
                <p className="text-lg font-bold">
                  {Math.max(0, (selectedKurs.fields.max_teilnehmer ?? 0) - kursBookings.length)}
                </p>
                <p className="text-xs text-muted-foreground">Freie Plätze</p>
              </div>
              <div className="p-3 text-center">
                <p className="text-lg font-bold text-green-600">
                  {formatCurrency(kursBookings.length * (selectedKurs.fields.kursgebuehr ?? 0))}
                </p>
                <p className="text-xs text-muted-foreground">Einnahmen bisher</p>
              </div>
            </div>
          </div>

          {/* Einnahmen-Tracker */}
          <BudgetTracker
            budget={(selectedKurs.fields.max_teilnehmer ?? 0) * (selectedKurs.fields.kursgebuehr ?? 0)}
            booked={kursBookings.length * (selectedKurs.fields.kursgebuehr ?? 0)}
            label="Einnahmenpotenzial"
          />

          {/* Trainer-Bereich */}
          <div className="space-y-3">
            <h3 className="font-semibold text-sm flex items-center gap-2">
              <IconUserCheck size={16} className="text-primary" />
              Trainer
            </h3>

            {/* Aktueller Trainer-Status */}
            {assignedTrainer ? (
              <div className="flex items-center gap-3 p-3 rounded-xl border bg-green-50 border-green-200">
                <div className="w-9 h-9 rounded-full bg-green-100 flex items-center justify-center shrink-0">
                  <IconCheck size={16} className="text-green-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-green-800 truncate">
                    {getTrainerName(assignedTrainer)}
                  </p>
                  <p className="text-xs text-green-600">Zugewiesener Trainer</p>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-3 p-3 rounded-xl border bg-amber-50 border-amber-200">
                <div className="w-9 h-9 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
                  <IconAlertTriangle size={16} className="text-amber-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-amber-800">Kein Trainer zugewiesen</p>
                  <p className="text-xs text-amber-600">Wähle einen Trainer aus der Liste unten.</p>
                </div>
              </div>
            )}

            {/* Trainer-Liste */}
            <div className="space-y-2">
              {trainer.map(t => {
                const isAssigned = t.record_id === assignedTrainerId;
                const isPending = t.record_id === pendingTrainerId;
                const specs = Array.isArray(t.fields.spezialisierungen)
                  ? t.fields.spezialisierungen
                      .map(s => (typeof s === 'object' && 'label' in s ? s.label : String(s)))
                      .join(', ')
                  : '';
                return (
                  <button
                    key={t.record_id}
                    onClick={() => setPendingTrainerId(isPending ? null : t.record_id)}
                    className={`w-full text-left flex items-center gap-3 p-4 rounded-xl border transition-colors overflow-hidden ${
                      isPending
                        ? 'bg-primary/5 border-primary/40 ring-2 ring-primary/20'
                        : isAssigned
                        ? 'bg-green-50 border-green-200'
                        : 'bg-card hover:bg-accent hover:border-primary/30'
                    }`}
                  >
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                      <IconStar size={18} className="text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm truncate">{getTrainerName(t)}</span>
                        {isAssigned && (
                          <span className="text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full shrink-0">
                            Aktuell
                          </span>
                        )}
                      </div>
                      {specs && (
                        <p className="text-xs text-muted-foreground mt-0.5 truncate">{specs}</p>
                      )}
                      {t.fields.erfahrung_jahre != null && (
                        <p className="text-xs text-muted-foreground">
                          {t.fields.erfahrung_jahre} Jahre Erfahrung
                        </p>
                      )}
                    </div>
                    {isPending ? (
                      <IconCheck size={16} className="text-primary shrink-0" />
                    ) : (
                      <IconChevronRight size={16} className="text-muted-foreground shrink-0" />
                    )}
                  </button>
                );
              })}

              {trainer.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-6">
                  Noch keine Trainer vorhanden.
                </p>
              )}
            </div>

            {/* Trainer zuweisen Button */}
            {pendingTrainerId && pendingTrainerId !== assignedTrainerId && (
              <Button
                onClick={handleAssignTrainer}
                disabled={assigningTrainer}
                className="w-full"
              >
                {assigningTrainer ? (
                  'Wird zugewiesen...'
                ) : (
                  <>
                    <IconUserCheck size={16} className="mr-2" />
                    Als Trainer zuweisen
                  </>
                )}
              </Button>
            )}

            {/* Neuen Trainer anlegen */}
            <Button variant="outline" className="w-full" onClick={() => setTrainerDialogOpen(true)}>
              <IconPlus size={16} className="mr-2" />
              Neuen Trainer anlegen
            </Button>
            <TrainerDialog
              open={trainerDialogOpen}
              onClose={() => setTrainerDialogOpen(false)}
              onSubmit={async (fields) => {
                await LivingAppsService.createTrainerEntry(fields);
                await fetchAll();
                setTrainerDialogOpen(false);
              }}
              defaultValues={undefined}
              enablePhotoScan={false}
              enablePhotoLocation={false}
            />
          </div>

          {/* Navigation */}
          <div className="flex items-center justify-between pt-2">
            <Button variant="outline" onClick={() => setCurrentStep(1)}>
              Zurück
            </Button>
            <Button onClick={() => setCurrentStep(3)}>
              Weiter zu Teilnehmern
              <IconChevronRight size={16} className="ml-1.5" />
            </Button>
          </div>
        </div>
      )}

      {/* ── STEP 3: Teilnehmer verwalten ── */}
      {currentStep === 3 && selectedKurs && !finished && (
        <div className="space-y-5">
          {/* Live Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="rounded-xl border bg-card p-4 text-center overflow-hidden">
              <p className="text-2xl font-bold">{bookingStats.total}</p>
              <p className="text-xs text-muted-foreground mt-0.5">Gesamtbuchungen</p>
            </div>
            <div className="rounded-xl border bg-card p-4 text-center overflow-hidden">
              <p className="text-2xl font-bold text-green-600">{bookingStats.bezahlt}</p>
              <p className="text-xs text-muted-foreground mt-0.5">Bezahlt</p>
            </div>
            <div className="rounded-xl border bg-card p-4 text-center overflow-hidden">
              <p className="text-2xl font-bold text-amber-600">{bookingStats.ausstehend}</p>
              <p className="text-xs text-muted-foreground mt-0.5">Ausstehend</p>
            </div>
            <div className="rounded-xl border bg-card p-4 text-center overflow-hidden">
              <p className="text-2xl font-bold text-primary truncate">
                {formatCurrency(bookingStats.einnahmen)}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">Gesamteinnahmen</p>
            </div>
          </div>

          {/* Teilnehmerliste */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-sm flex items-center gap-2">
                <IconUsers size={16} className="text-primary" />
                Teilnehmer ({kursBookings.length})
              </h3>
              <Button size="sm" onClick={() => setBuchungDialogOpen(true)}>
                <IconPlus size={14} className="mr-1.5" />
                Neue Buchung
              </Button>
            </div>

            {kursBookings.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground rounded-xl border bg-card">
                <IconUsers size={40} className="mx-auto mb-3 opacity-30" />
                <p className="text-sm">Noch keine Buchungen für diesen Kurs.</p>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-3"
                  onClick={() => setBuchungDialogOpen(true)}
                >
                  <IconPlus size={14} className="mr-1.5" />
                  Erste Buchung hinzufügen
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                {kursBookings.map(b => {
                  const mitgliedName = getMitgliedName(b.fields.mitglied);
                  return (
                    <div
                      key={b.record_id}
                      className="flex items-center gap-3 p-4 rounded-xl border bg-card overflow-hidden"
                    >
                      <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                        <IconUserCheck size={16} className="text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium text-sm truncate">{mitgliedName}</span>
                          <StatusBadge
                            statusKey={b.fields.zahlungsstatus?.key}
                            label={b.fields.zahlungsstatus?.label}
                          />
                        </div>
                        <div className="flex items-center gap-3 mt-0.5 text-xs text-muted-foreground flex-wrap">
                          {b.fields.zahlungsart?.label && (
                            <span>{b.fields.zahlungsart.label}</span>
                          )}
                          {b.fields.betrag != null && (
                            <span>{formatCurrency(b.fields.betrag)}</span>
                          )}
                          {b.fields.buchungsdatum && (
                            <span>{formatDate(b.fields.buchungsdatum)}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Buchungen Dialog */}
            <BuchungenDialog
              open={buchungDialogOpen}
              onClose={() => setBuchungDialogOpen(false)}
              onSubmit={async (fields) => {
                await LivingAppsService.createBuchungenEntry(fields);
                await fetchAll();
                setBuchungDialogOpen(false);
              }}
              defaultValues={buchungDefaultValues}
              mitgliederList={mitglieder}
              kurseList={kurse}
              enablePhotoScan={false}
              enablePhotoLocation={false}
            />
          </div>

          {/* Navigation */}
          <div className="flex items-center justify-between pt-2">
            <Button variant="outline" onClick={() => setCurrentStep(2)}>
              Zurück
            </Button>
            <Button onClick={handleFinish}>
              <IconCheck size={16} className="mr-1.5" />
              Fertig
            </Button>
          </div>
        </div>
      )}

      {/* ── ABSCHLUSS ── */}
      {currentStep === 3 && finished && (
        <div className="flex flex-col items-center justify-center py-16 gap-5 text-center">
          <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center">
            <IconCheck size={30} className="text-green-600" stroke={2.5} />
          </div>
          <div>
            <h2 className="text-xl font-bold text-foreground mb-1">Kurs erfolgreich geplant!</h2>
            <p className="text-sm text-muted-foreground max-w-sm">
              Kurs <span className="font-medium text-foreground">
                &ldquo;{selectedKurs?.fields.kursname ?? ''}&rdquo;
              </span> wurde erfolgreich geplant. Du kannst den Kurs jederzeit weiter bearbeiten.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 w-full max-w-xs">
            <Button variant="outline" className="flex-1" onClick={() => setFinished(false)}>
              Weitere Buchungen
            </Button>
            <Button className="flex-1" onClick={handleRestart}>
              Neuen Kurs planen
            </Button>
          </div>
        </div>
      )}
    </IntentWizardShell>
  );
}
