import { useState, useEffect, useMemo } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { IntentWizardShell } from '@/components/IntentWizardShell';
import { EntitySelectStep } from '@/components/EntitySelectStep';
import { MitgliederDialog } from '@/components/dialogs/MitgliederDialog';
import { KurseDialog } from '@/components/dialogs/KurseDialog';
import { BuchungenDialog } from '@/components/dialogs/BuchungenDialog';
import { LivingAppsService, createRecordUrl, extractRecordId } from '@/services/livingAppsService';
import { useDashboardData } from '@/hooks/useDashboardData';
import { APP_IDS } from '@/types/app';
import type { Mitglieder, Kurse } from '@/types/app';
import { Button } from '@/components/ui/button';
import {
  IconUserPlus,
  IconBook,
  IconCheck,
  IconArrowRight,
  IconPlus,
  IconUsers,
  IconCalendarEvent,
  IconCurrencyEuro,
  IconCircleCheck,
} from '@tabler/icons-react';

export default function MitgliedEinschreibenPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { mitglieder, buchungen, trainer, kurse, loading, error, fetchAll } = useDashboardData();

  // Wizard state
  const [currentStep, setCurrentStep] = useState<number>(() => {
    const urlStep = parseInt(searchParams.get('step') ?? '', 10);
    if (urlStep >= 1 && urlStep <= 3) return urlStep;
    return 1;
  });

  const [selectedMitglied, setSelectedMitglied] = useState<Mitglieder | null>(null);
  const [selectedKurs, setSelectedKurs] = useState<Kurse | null>(null);
  const [buchungErfolg, setBuchungErfolg] = useState(false);

  // Dialog open states
  const [mitgliederDialogOpen, setMitgliederDialogOpen] = useState(false);
  const [kurseDialogOpen, setKurseDialogOpen] = useState(false);
  const [buchungDialogOpen, setBuchungDialogOpen] = useState(false);

  // Deep-linking: pre-select mitglied from URL
  const mitgliedIdParam = searchParams.get('mitgliedId');
  const kursIdParam = searchParams.get('kursId');

  useEffect(() => {
    if (mitgliedIdParam && mitglieder.length > 0 && !selectedMitglied) {
      const found = mitglieder.find(m => m.record_id === mitgliedIdParam);
      if (found) {
        setSelectedMitglied(found);
        if (currentStep === 1) setCurrentStep(2);
      }
    }
  }, [mitgliedIdParam, mitglieder, selectedMitglied, currentStep]);

  useEffect(() => {
    if (kursIdParam && kurse.length > 0 && !selectedKurs && selectedMitglied) {
      const found = kurse.find(k => k.record_id === kursIdParam);
      if (found) {
        setSelectedKurs(found);
        if (currentStep <= 2) setCurrentStep(3);
      }
    }
  }, [kursIdParam, kurse, selectedKurs, selectedMitglied, currentStep]);

  // Sync step to URL
  useEffect(() => {
    const params = new URLSearchParams(searchParams);
    if (currentStep > 1) {
      params.set('step', String(currentStep));
    } else {
      params.delete('step');
    }
    setSearchParams(params, { replace: true });
  }, [currentStep]);

  // Count bookings per course
  const buchungenPerKurs = useMemo(() => {
    const counts = new Map<string, number>();
    buchungen.forEach(b => {
      if (b.fields.kurs) {
        const id = extractRecordId(b.fields.kurs);
        if (id) counts.set(id, (counts.get(id) ?? 0) + 1);
      }
    });
    return counts;
  }, [buchungen]);

  // BuchungenDialog default values
  const buchungDefaultValues = useMemo(() => {
    if (!selectedMitglied || !selectedKurs) return undefined;
    return {
      mitglied: createRecordUrl(APP_IDS.MITGLIEDER, selectedMitglied.record_id),
      kurs: createRecordUrl(APP_IDS.KURSE, selectedKurs.record_id),
      betrag: selectedKurs.fields.kursgebuehr,
    };
  }, [selectedMitglied, selectedKurs]);

  // Handlers
  function handleMitgliedSelect(id: string) {
    const found = mitglieder.find(m => m.record_id === id);
    if (found) {
      setSelectedMitglied(found);
      setCurrentStep(2);
    }
  }

  function handleKursSelect(id: string) {
    const found = kurse.find(k => k.record_id === id);
    if (found) {
      setSelectedKurs(found);
      setCurrentStep(3);
      setBuchungDialogOpen(true);
    }
  }

  function handleWeiteresBuchung() {
    setSelectedMitglied(null);
    setSelectedKurs(null);
    setBuchungErfolg(false);
    setBuchungDialogOpen(false);
    setCurrentStep(1);
    const params = new URLSearchParams();
    setSearchParams(params, { replace: true });
  }

  // Mitglieder items for EntitySelectStep
  const mitgliederItems = useMemo(() =>
    mitglieder.map(m => ({
      id: m.record_id,
      title: [m.fields.vorname, m.fields.nachname].filter(Boolean).join(' ') || '(Kein Name)',
      subtitle: m.fields.email ?? undefined,
      status: m.fields.mitgliedschaft_typ
        ? { key: m.fields.mitgliedschaft_typ.key, label: m.fields.mitgliedschaft_typ.label }
        : undefined,
      stats: m.fields.mitglied_seit
        ? [{ label: 'Mitglied seit', value: m.fields.mitglied_seit }]
        : [],
      icon: <IconUsers size={18} className="text-primary" />,
    })),
    [mitglieder]
  );

  // Kurse items for EntitySelectStep
  const kurseItems = useMemo(() =>
    kurse.map(k => {
      const buchungCount = buchungenPerKurs.get(k.record_id) ?? 0;
      const maxTeilnehmer = k.fields.max_teilnehmer ?? 0;
      const freiePlaetze = maxTeilnehmer > 0 ? maxTeilnehmer - buchungCount : null;
      const ausgebucht = freiePlaetze !== null && freiePlaetze <= 0;
      const wochentage = Array.isArray(k.fields.wochentag)
        ? k.fields.wochentag.map(w => w.label).join(', ')
        : '';

      const stats: { label: string; value: string | number }[] = [];
      if (k.fields.yoga_stil) stats.push({ label: 'Stil', value: k.fields.yoga_stil.label });
      if (k.fields.niveau) stats.push({ label: 'Niveau', value: k.fields.niveau.label });
      if (k.fields.uhrzeit) stats.push({ label: 'Uhrzeit', value: k.fields.uhrzeit });
      if (freiePlaetze !== null) {
        stats.push({ label: 'Freie Plätze', value: ausgebucht ? 'Ausgebucht' : freiePlaetze });
      }
      if (k.fields.kursgebuehr != null) {
        stats.push({ label: 'Gebühr', value: `${k.fields.kursgebuehr} €` });
      }

      return {
        id: k.record_id,
        title: k.fields.kursname ?? '(Kein Name)',
        subtitle: wochentage || undefined,
        status: ausgebucht ? { key: 'storniert', label: 'Ausgebucht' } : undefined,
        stats,
        icon: <IconBook size={18} className="text-primary" />,
      };
    }),
    [kurse, buchungenPerKurs]
  );

  const wizardSteps = [
    { label: 'Mitglied' },
    { label: 'Kurs' },
    { label: 'Buchung' },
  ];

  return (
    <IntentWizardShell
      title="Mitglied einschreiben"
      subtitle="Schreibe ein Mitglied in einen Kurs ein und erstelle die Buchung."
      steps={wizardSteps}
      currentStep={currentStep}
      onStepChange={setCurrentStep}
      loading={loading}
      error={error}
      onRetry={fetchAll}
    >
      {/* Step 1: Mitglied auswählen */}
      {currentStep === 1 && (
        <div className="space-y-4">
          <div>
            <h2 className="text-lg font-semibold">Welches Mitglied möchtest du einschreiben?</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Wähle ein bestehendes Mitglied aus oder lege ein neues an.
            </p>
          </div>
          <EntitySelectStep
            items={mitgliederItems}
            onSelect={handleMitgliedSelect}
            searchPlaceholder="Mitglied suchen..."
            emptyText="Keine Mitglieder gefunden."
            emptyIcon={<IconUsers size={32} />}
            createLabel="Neues Mitglied"
            onCreateNew={() => setMitgliederDialogOpen(true)}
            createDialog={
              <MitgliederDialog
                open={mitgliederDialogOpen}
                onClose={() => setMitgliederDialogOpen(false)}
                onSubmit={async (fields) => {
                  const result = await LivingAppsService.createMitgliederEntry(fields);
                  await fetchAll();
                  // Auto-select newly created member
                  const newId = Object.keys(result)[0];
                  if (newId) {
                    const found = mitglieder.find(m => m.record_id === newId);
                    if (found) {
                      setSelectedMitglied(found);
                      setCurrentStep(2);
                    }
                  }
                  setMitgliederDialogOpen(false);
                }}
                defaultValues={undefined}
                enablePhotoScan={false}
                enablePhotoLocation={false}
              />
            }
          />
        </div>
      )}

      {/* Step 2: Kurs auswählen */}
      {currentStep === 2 && (
        <div className="space-y-4">
          {/* Selected member context */}
          {selectedMitglied && (
            <div className="flex items-center gap-3 p-3 rounded-xl bg-primary/5 border border-primary/20">
              <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                <IconCheck size={16} className="text-primary" />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground">Ausgewähltes Mitglied</p>
                <p className="text-sm font-medium truncate">
                  {[selectedMitglied.fields.vorname, selectedMitglied.fields.nachname].filter(Boolean).join(' ')}
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="ml-auto shrink-0 text-xs"
                onClick={() => setCurrentStep(1)}
              >
                Ändern
              </Button>
            </div>
          )}

          <div>
            <h2 className="text-lg font-semibold">Welchen Kurs soll das Mitglied besuchen?</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Wähle einen verfügbaren Kurs aus oder erstelle einen neuen.
            </p>
          </div>

          <EntitySelectStep
            items={kurseItems}
            onSelect={handleKursSelect}
            searchPlaceholder="Kurs suchen..."
            emptyText="Keine Kurse gefunden."
            emptyIcon={<IconBook size={32} />}
            createLabel="Neuen Kurs"
            onCreateNew={() => setKurseDialogOpen(true)}
            createDialog={
              <KurseDialog
                open={kurseDialogOpen}
                onClose={() => setKurseDialogOpen(false)}
                onSubmit={async (fields) => {
                  const result = await LivingAppsService.createKurseEntry(fields);
                  await fetchAll();
                  const newId = Object.keys(result)[0];
                  if (newId) {
                    const found = kurse.find(k => k.record_id === newId);
                    if (found) {
                      setSelectedKurs(found);
                      setCurrentStep(3);
                      setBuchungDialogOpen(true);
                    }
                  }
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

      {/* Step 3: Buchung erstellen & Zusammenfassung */}
      {currentStep === 3 && !buchungErfolg && (
        <div className="space-y-4">
          {/* Summary cards */}
          <div>
            <h2 className="text-lg font-semibold">Buchung bestätigen</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Überprüfe die Zusammenfassung und erstelle die Buchung.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Member card */}
            {selectedMitglied && (
              <div className="rounded-xl border bg-card p-4 overflow-hidden">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center shrink-0">
                    <IconUsers size={16} className="text-blue-600" />
                  </div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Mitglied</p>
                </div>
                <p className="font-semibold truncate">
                  {[selectedMitglied.fields.vorname, selectedMitglied.fields.nachname].filter(Boolean).join(' ')}
                </p>
                {selectedMitglied.fields.email && (
                  <p className="text-sm text-muted-foreground truncate mt-0.5">{selectedMitglied.fields.email}</p>
                )}
                {selectedMitglied.fields.mitgliedschaft_typ && (
                  <p className="text-xs text-muted-foreground mt-1">{selectedMitglied.fields.mitgliedschaft_typ.label}</p>
                )}
              </div>
            )}

            {/* Course card */}
            {selectedKurs && (
              <div className="rounded-xl border bg-card p-4 overflow-hidden">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center shrink-0">
                    <IconBook size={16} className="text-emerald-600" />
                  </div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Kurs</p>
                </div>
                <p className="font-semibold truncate">{selectedKurs.fields.kursname ?? '(Kein Name)'}</p>
                <div className="mt-1 space-y-0.5">
                  {selectedKurs.fields.yoga_stil && (
                    <p className="text-sm text-muted-foreground truncate">{selectedKurs.fields.yoga_stil.label}</p>
                  )}
                  <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-muted-foreground mt-1">
                    {selectedKurs.fields.uhrzeit && (
                      <span className="flex items-center gap-1">
                        <IconCalendarEvent size={12} />
                        {selectedKurs.fields.uhrzeit}
                      </span>
                    )}
                    {selectedKurs.fields.kursgebuehr != null && (
                      <span className="flex items-center gap-1">
                        <IconCurrencyEuro size={12} />
                        {selectedKurs.fields.kursgebuehr} €
                      </span>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Action buttons */}
          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <Button
              variant="outline"
              onClick={() => setCurrentStep(2)}
              className="sm:w-auto w-full"
            >
              Kurs ändern
            </Button>
            <Button
              className="sm:flex-1 w-full gap-2"
              onClick={() => setBuchungDialogOpen(true)}
            >
              <IconArrowRight size={16} />
              Buchung erstellen
            </Button>
          </div>

          {/* Buchungen Dialog */}
          <BuchungenDialog
            open={buchungDialogOpen}
            onClose={() => setBuchungDialogOpen(false)}
            onSubmit={async (fields) => {
              await LivingAppsService.createBuchungenEntry(fields);
              await fetchAll();
              setBuchungErfolg(true);
              setBuchungDialogOpen(false);
            }}
            defaultValues={buchungDefaultValues}
            mitgliederList={mitglieder}
            kurseList={kurse}
            enablePhotoScan={false}
            enablePhotoLocation={false}
          />
        </div>
      )}

      {/* Success state */}
      {currentStep === 3 && buchungErfolg && (
        <div className="space-y-6">
          {/* Success banner */}
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-6 flex flex-col items-center text-center gap-3">
            <div className="w-14 h-14 rounded-full bg-emerald-100 flex items-center justify-center">
              <IconCircleCheck size={32} className="text-emerald-600" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-emerald-800">Buchung erfolgreich!</h2>
              <p className="text-sm text-emerald-700 mt-1">
                Das Mitglied wurde erfolgreich in den Kurs eingeschrieben.
              </p>
            </div>
          </div>

          {/* Summary */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {selectedMitglied && (
              <div className="rounded-xl border bg-card p-4 overflow-hidden">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center shrink-0">
                    <IconUsers size={16} className="text-blue-600" />
                  </div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Mitglied</p>
                </div>
                <p className="font-semibold truncate">
                  {[selectedMitglied.fields.vorname, selectedMitglied.fields.nachname].filter(Boolean).join(' ')}
                </p>
                {selectedMitglied.fields.email && (
                  <p className="text-sm text-muted-foreground truncate mt-0.5">{selectedMitglied.fields.email}</p>
                )}
              </div>
            )}
            {selectedKurs && (
              <div className="rounded-xl border bg-card p-4 overflow-hidden">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center shrink-0">
                    <IconBook size={16} className="text-emerald-600" />
                  </div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Kurs</p>
                </div>
                <p className="font-semibold truncate">{selectedKurs.fields.kursname ?? '(Kein Name)'}</p>
                {selectedKurs.fields.yoga_stil && (
                  <p className="text-sm text-muted-foreground truncate mt-0.5">{selectedKurs.fields.yoga_stil.label}</p>
                )}
                {selectedKurs.fields.kursgebuehr != null && (
                  <p className="text-xs text-muted-foreground mt-1">{selectedKurs.fields.kursgebuehr} €</p>
                )}
              </div>
            )}
          </div>

          {/* Action buttons */}
          <div className="flex flex-col sm:flex-row gap-3">
            <Button
              variant="outline"
              className="w-full sm:w-auto gap-2"
              onClick={handleWeiteresBuchung}
            >
              <IconPlus size={16} />
              Weitere Buchung
            </Button>
            <Link to="/buchungen" className="w-full sm:w-auto">
              <Button className="w-full gap-2">
                <IconUserPlus size={16} />
                Zu den Buchungen
              </Button>
            </Link>
          </div>
        </div>
      )}
    </IntentWizardShell>
  );
}
