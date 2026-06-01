import { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { IntentWizardShell } from '@/components/IntentWizardShell';
import { EntitySelectStep } from '@/components/EntitySelectStep';
import { StatusBadge } from '@/components/StatusBadge';
import { useDashboardData } from '@/hooks/useDashboardData';
import { LivingAppsService, createRecordUrl, extractRecordId } from '@/services/livingAppsService';
import { APP_IDS, LOOKUP_OPTIONS } from '@/types/app';
import type { Mitglieder, Kurse } from '@/types/app';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import {
  IconUser,
  IconBook,
  IconCreditCard,
  IconCheck,
  IconAlertTriangle,
  IconCalendar,
  IconClock,
  IconUsers,
  IconCurrencyEuro,
  IconArrowRight,
  IconArrowLeft,
  IconRefresh,
} from '@tabler/icons-react';
import { format, parseISO } from 'date-fns';
import { de } from 'date-fns/locale';

const WIZARD_STEPS = [
  { label: 'Mitglied' },
  { label: 'Kurs' },
  { label: 'Details' },
  { label: 'Bestätigung' },
];

function formatDate(dateStr?: string): string {
  if (!dateStr) return '—';
  try {
    return format(parseISO(dateStr), 'dd.MM.yyyy', { locale: de });
  } catch {
    return dateStr;
  }
}

export default function KursBuchenPage() {
  const [searchParams] = useSearchParams();

  // --- All hooks before early returns ---
  const { kurse, mitglieder, buchungen, loading, error, fetchAll } = useDashboardData();

  const [step, setStep] = useState<number>(() => {
    const urlStep = parseInt(searchParams.get('step') ?? '', 10);
    return urlStep >= 1 && urlStep <= 4 ? urlStep : 1;
  });

  const [selectedMitgliedId, setSelectedMitgliedId] = useState<string | null>(() => {
    return searchParams.get('mitgliedId') ?? null;
  });
  const [selectedKursId, setSelectedKursId] = useState<string | null>(() => {
    return searchParams.get('kursId') ?? null;
  });

  // Step 3: Buchungsdetails form state
  const [zahlungsart, setZahlungsart] = useState<string>('');
  const [zahlungsstatus, setZahlungsstatus] = useState<string>('ausstehend');
  const [betrag, setBetrag] = useState<string>('');
  const [buchungsdatum, setBuchungsdatum] = useState<string>('2026-06-01');
  const [anmerkungen, setAnmerkungen] = useState<string>('');

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [createdBuchungId, setCreatedBuchungId] = useState<string | null>(null);

  // Pre-fill betrag when kurs is selected
  useEffect(() => {
    if (selectedKursId) {
      const kurs = kurse.find(k => k.record_id === selectedKursId);
      if (kurs?.fields.kursgebuehr != null) {
        setBetrag(String(kurs.fields.kursgebuehr));
      }
    }
  }, [selectedKursId, kurse]);

  // Derived data
  const selectedMitglied: Mitglieder | undefined = useMemo(
    () => mitglieder.find(m => m.record_id === selectedMitgliedId) ?? undefined,
    [mitglieder, selectedMitgliedId]
  );

  const selectedKurs: Kurse | undefined = useMemo(
    () => kurse.find(k => k.record_id === selectedKursId) ?? undefined,
    [kurse, selectedKursId]
  );

  const buchungenFuerKurs: number = useMemo(() => {
    if (!selectedKursId) return 0;
    return buchungen.filter(b => {
      const kursId = extractRecordId(b.fields.kurs);
      return kursId === selectedKursId;
    }).length;
  }, [buchungen, selectedKursId]);

  const zahlungsartOptions = LOOKUP_OPTIONS['buchungen']?.zahlungsart ?? [];
  const zahlungsstatusOptions = LOOKUP_OPTIONS['buchungen']?.zahlungsstatus ?? [];

  // --- Step navigation ---
  function handleMitgliedSelect(id: string) {
    setSelectedMitgliedId(id);
    setStep(2);
  }

  function handleKursSelect(id: string) {
    setSelectedKursId(id);
    setStep(3);
  }

  function handleReset() {
    setStep(1);
    setSelectedMitgliedId(null);
    setSelectedKursId(null);
    setZahlungsart('');
    setZahlungsstatus('ausstehend');
    setBetrag('');
    setBuchungsdatum('2026-06-01');
    setAnmerkungen('');
    setSubmitError(null);
    setCreatedBuchungId(null);
  }

  async function handleSubmit() {
    if (!selectedMitgliedId || !selectedKursId) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      const result = await LivingAppsService.createBuchungenEntry({
        mitglied: createRecordUrl(APP_IDS.MITGLIEDER, selectedMitgliedId),
        kurs: createRecordUrl(APP_IDS.KURSE, selectedKursId),
        zahlungsstatus: zahlungsstatus || undefined,
        zahlungsart: zahlungsart || undefined,
        betrag: betrag ? parseFloat(betrag) : undefined,
        buchungsdatum: buchungsdatum || undefined,
        anmerkungen: anmerkungen || undefined,
      });
      // Extract new record id from result
      let newId: string | null = null;
      if (result && typeof result === 'object') {
        const entries = Object.entries(result as Record<string, unknown>);
        if (entries.length > 0) {
          newId = entries[0][0];
        }
      }
      setCreatedBuchungId(newId);
      await fetchAll();
      setStep(4);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Unbekannter Fehler beim Speichern.');
    } finally {
      setSubmitting(false);
    }
  }

  // Capacity warning
  const maxTeilnehmer = selectedKurs?.fields.max_teilnehmer;
  const atCapacity = maxTeilnehmer != null && buchungenFuerKurs >= maxTeilnehmer;
  const nearCapacity = maxTeilnehmer != null && !atCapacity && buchungenFuerKurs >= maxTeilnehmer * 0.8;

  // Member name helper
  const mitgliedName = selectedMitglied
    ? `${selectedMitglied.fields.vorname ?? ''} ${selectedMitglied.fields.nachname ?? ''}`.trim()
    : '—';

  const kursName = selectedKurs?.fields.kursname ?? '—';

  return (
    <IntentWizardShell
      title="Kurs buchen"
      subtitle="Mitglied einem Kurs zuweisen — schnell und übersichtlich"
      steps={WIZARD_STEPS}
      currentStep={step}
      onStepChange={setStep}
      loading={loading}
      error={error}
      onRetry={fetchAll}
    >
      {/* ─── STEP 1: Mitglied auswählen ─── */}
      {step === 1 && (
        <div className="space-y-4">
          <div>
            <h2 className="text-lg font-semibold text-foreground">Mitglied auswählen</h2>
            <p className="text-sm text-muted-foreground mt-0.5">
              Wähle das Mitglied aus, das du für einen Kurs einbuchen möchtest.
            </p>
          </div>
          <EntitySelectStep
            searchPlaceholder="Name oder E-Mail suchen..."
            emptyIcon={<IconUser size={32} />}
            emptyText="Kein Mitglied gefunden."
            items={mitglieder.map(m => ({
              id: m.record_id,
              title: `${m.fields.vorname ?? ''} ${m.fields.nachname ?? ''}`.trim() || '(Kein Name)',
              subtitle: m.fields.email ?? '',
              status: m.fields.mitgliedschaft_typ
                ? { key: m.fields.mitgliedschaft_typ.key, label: m.fields.mitgliedschaft_typ.label }
                : undefined,
              stats: [
                { label: 'Mitglied seit', value: formatDate(m.fields.mitglied_seit) },
              ],
              icon: <IconUser size={20} className="text-primary" />,
            }))}
            onSelect={handleMitgliedSelect}
          />
        </div>
      )}

      {/* ─── STEP 2: Kurs auswählen ─── */}
      {step === 2 && (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setStep(1)}
              className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <IconArrowLeft size={15} />
              Zurück
            </button>
            <div>
              <h2 className="text-lg font-semibold text-foreground">Kurs auswählen</h2>
              <p className="text-sm text-muted-foreground mt-0.5">
                Mitglied: <span className="font-medium text-foreground">{mitgliedName}</span>
              </p>
            </div>
          </div>
          <EntitySelectStep
            searchPlaceholder="Kursname oder Stil suchen..."
            emptyIcon={<IconBook size={32} />}
            emptyText="Kein Kurs gefunden."
            items={kurse.map(k => {
              const wochentage = Array.isArray(k.fields.wochentag)
                ? k.fields.wochentag.map(w => w.label).join(', ')
                : '';
              const subtitle = [
                k.fields.yoga_stil?.label,
                k.fields.niveau?.label,
                wochentage,
                k.fields.uhrzeit,
              ]
                .filter(Boolean)
                .join(' · ');
              const kBuchungen = buchungen.filter(b => extractRecordId(b.fields.kurs) === k.record_id).length;
              const max = k.fields.max_teilnehmer;
              return {
                id: k.record_id,
                title: k.fields.kursname ?? '(Kein Name)',
                subtitle,
                stats: [
                  { label: 'Gebühr', value: k.fields.kursgebuehr != null ? `${k.fields.kursgebuehr} €` : '—' },
                  { label: 'Teilnehmer', value: max != null ? `${kBuchungen}/${max}` : String(kBuchungen) },
                  ...(k.fields.startdatum ? [{ label: 'Start', value: formatDate(k.fields.startdatum) }] : []),
                ],
                icon: <IconBook size={20} className="text-primary" />,
              };
            })}
            onSelect={handleKursSelect}
          />
        </div>
      )}

      {/* ─── STEP 3: Buchungsdetails ─── */}
      {step === 3 && (
        <div className="space-y-5">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setStep(2)}
              className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <IconArrowLeft size={15} />
              Zurück
            </button>
            <div>
              <h2 className="text-lg font-semibold text-foreground">Buchungsdetails</h2>
              <p className="text-sm text-muted-foreground mt-0.5">
                Zahlungsart, Betrag und weitere Details festlegen.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            {/* Left: Form */}
            <div className="lg:col-span-2 space-y-5">
              {/* Capacity warning */}
              {(atCapacity || nearCapacity) && selectedKurs && (
                <div className={`flex items-start gap-3 p-3 rounded-xl border text-sm ${
                  atCapacity
                    ? 'bg-destructive/10 border-destructive/20 text-destructive'
                    : 'bg-amber-50 border-amber-200 text-amber-800'
                }`}>
                  <IconAlertTriangle size={16} className="shrink-0 mt-0.5" />
                  <span>
                    {atCapacity
                      ? `Dieser Kurs ist ausgebucht (${buchungenFuerKurs}/${maxTeilnehmer} Plätze belegt).`
                      : `Fast ausgebucht: noch ${(maxTeilnehmer ?? 0) - buchungenFuerKurs} Plätze frei.`}
                  </span>
                </div>
              )}

              {/* Kurs bookings counter */}
              {selectedKursId && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <IconUsers size={14} />
                  <span>
                    Bereits <span className="font-semibold text-foreground">{buchungenFuerKurs}</span>
                    {maxTeilnehmer != null ? ` von ${maxTeilnehmer}` : ''} Buchungen für diesen Kurs
                  </span>
                </div>
              )}

              {/* Zahlungsart */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Zahlungsart</label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {zahlungsartOptions.map(opt => (
                    <button
                      key={opt.key}
                      type="button"
                      onClick={() => setZahlungsart(opt.key)}
                      className={`flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl border text-sm font-medium transition-colors ${
                        zahlungsart === opt.key
                          ? 'bg-primary text-primary-foreground border-primary'
                          : 'bg-card border-border text-foreground hover:bg-accent hover:border-primary/30'
                      }`}
                    >
                      <IconCreditCard size={15} />
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Zahlungsstatus */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Zahlungsstatus</label>
                <div className="flex flex-wrap gap-2">
                  {zahlungsstatusOptions.map(opt => (
                    <button
                      key={opt.key}
                      type="button"
                      onClick={() => setZahlungsstatus(opt.key)}
                      className={`flex items-center gap-1.5 px-4 py-2 rounded-xl border text-sm font-medium transition-colors ${
                        zahlungsstatus === opt.key
                          ? 'bg-primary text-primary-foreground border-primary'
                          : 'bg-card border-border text-foreground hover:bg-accent hover:border-primary/30'
                      }`}
                    >
                      {zahlungsstatus === opt.key && <IconCheck size={13} stroke={2.5} />}
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Betrag + Datum */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-foreground flex items-center gap-1.5">
                    <IconCurrencyEuro size={14} />
                    Betrag (€)
                  </label>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={betrag}
                    onChange={e => setBetrag(e.target.value)}
                    placeholder="0.00"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-foreground flex items-center gap-1.5">
                    <IconCalendar size={14} />
                    Buchungsdatum
                  </label>
                  <Input
                    type="date"
                    value={buchungsdatum}
                    onChange={e => setBuchungsdatum(e.target.value)}
                  />
                </div>
              </div>

              {/* Anmerkungen */}
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-foreground">
                  Anmerkungen <span className="text-muted-foreground font-normal">(optional)</span>
                </label>
                <Textarea
                  value={anmerkungen}
                  onChange={e => setAnmerkungen(e.target.value)}
                  placeholder="Besondere Wünsche, Hinweise..."
                  rows={3}
                  className="resize-none"
                />
              </div>

              {submitError && (
                <div className="flex items-start gap-2 p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-sm text-destructive">
                  <IconAlertTriangle size={15} className="shrink-0 mt-0.5" />
                  <span>{submitError}</span>
                </div>
              )}

              {/* CTA */}
              <div className="flex gap-3 pt-1">
                <Button
                  onClick={handleSubmit}
                  disabled={submitting || !zahlungsart}
                  className="flex-1 sm:flex-none gap-2"
                >
                  {submitting ? (
                    <>
                      <IconRefresh size={16} className="animate-spin" />
                      Buchen...
                    </>
                  ) : (
                    <>
                      <IconCheck size={16} />
                      Jetzt buchen
                    </>
                  )}
                </Button>
                <Button variant="outline" onClick={() => setStep(2)} disabled={submitting}>
                  Zurück
                </Button>
              </div>
            </div>

            {/* Right: Summary card */}
            <div className="lg:col-span-1">
              <Card className="overflow-hidden sticky top-4">
                <CardContent className="p-4 space-y-4">
                  <h3 className="font-semibold text-sm text-foreground">Zusammenfassung</h3>

                  <div className="space-y-3">
                    <div className="flex items-start gap-2.5">
                      <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                        <IconUser size={14} className="text-primary" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs text-muted-foreground">Mitglied</p>
                        <p className="text-sm font-medium truncate">{mitgliedName}</p>
                        {selectedMitglied?.fields.email && (
                          <p className="text-xs text-muted-foreground truncate">{selectedMitglied.fields.email}</p>
                        )}
                        {selectedMitglied?.fields.mitgliedschaft_typ && (
                          <StatusBadge
                            statusKey={selectedMitglied.fields.mitgliedschaft_typ.key}
                            label={selectedMitglied.fields.mitgliedschaft_typ.label}
                          />
                        )}
                      </div>
                    </div>

                    <div className="h-px bg-border" />

                    <div className="flex items-start gap-2.5">
                      <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                        <IconBook size={14} className="text-primary" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs text-muted-foreground">Kurs</p>
                        <p className="text-sm font-medium truncate">{kursName}</p>
                        {selectedKurs?.fields.yoga_stil && (
                          <p className="text-xs text-muted-foreground">{selectedKurs.fields.yoga_stil.label}</p>
                        )}
                        {selectedKurs?.fields.uhrzeit && (
                          <p className="text-xs text-muted-foreground flex items-center gap-1">
                            <IconClock size={11} />
                            {selectedKurs.fields.uhrzeit}
                            {selectedKurs.fields.dauer_minuten ? ` · ${selectedKurs.fields.dauer_minuten} Min.` : ''}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="h-px bg-border" />

                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Betrag</span>
                      <span className="text-lg font-bold text-foreground">
                        {betrag ? `${parseFloat(betrag).toFixed(2)} €` : '— €'}
                      </span>
                    </div>

                    {zahlungsart && (
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Zahlungsart</span>
                        <span className="font-medium">
                          {zahlungsartOptions.find(o => o.key === zahlungsart)?.label ?? zahlungsart}
                        </span>
                      </div>
                    )}

                    {zahlungsstatus && (
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Status</span>
                        <StatusBadge
                          statusKey={zahlungsstatus}
                          label={zahlungsstatusOptions.find(o => o.key === zahlungsstatus)?.label ?? zahlungsstatus}
                        />
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      )}

      {/* ─── STEP 4: Bestätigung ─── */}
      {step === 4 && (
        <div className="flex flex-col items-center text-center py-10 space-y-6">
          <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center">
            <IconCheck size={32} className="text-green-600" stroke={2.5} />
          </div>

          <div className="space-y-1">
            <h2 className="text-xl font-bold text-foreground">Buchung erfolgreich!</h2>
            <p className="text-sm text-muted-foreground max-w-sm">
              <span className="font-medium text-foreground">{mitgliedName}</span> wurde erfolgreich für den Kurs{' '}
              <span className="font-medium text-foreground">{kursName}</span> eingebucht.
            </p>
          </div>

          <Card className="w-full max-w-sm overflow-hidden text-left">
            <CardContent className="p-4 space-y-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <IconUser size={16} className="text-primary" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground">Mitglied</p>
                  <p className="text-sm font-medium truncate">{mitgliedName}</p>
                </div>
              </div>

              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <IconBook size={16} className="text-primary" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground">Kurs</p>
                  <p className="text-sm font-medium truncate">{kursName}</p>
                  {selectedKurs?.fields.yoga_stil && (
                    <p className="text-xs text-muted-foreground">{selectedKurs.fields.yoga_stil.label}</p>
                  )}
                </div>
              </div>

              <div className="h-px bg-border" />

              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Betrag</span>
                <span className="font-semibold">
                  {betrag ? `${parseFloat(betrag).toFixed(2)} €` : '—'}
                </span>
              </div>

              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Zahlungsart</span>
                <span className="font-medium">
                  {zahlungsartOptions.find(o => o.key === zahlungsart)?.label ?? '—'}
                </span>
              </div>

              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Status</span>
                <StatusBadge
                  statusKey={zahlungsstatus}
                  label={zahlungsstatusOptions.find(o => o.key === zahlungsstatus)?.label ?? zahlungsstatus}
                />
              </div>

              {buchungsdatum && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Buchungsdatum</span>
                  <span className="font-medium">{formatDate(buchungsdatum)}</span>
                </div>
              )}

              {createdBuchungId && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Buchungs-ID</span>
                  <span className="font-mono text-xs text-muted-foreground truncate max-w-[120px]">{createdBuchungId}</span>
                </div>
              )}
            </CardContent>
          </Card>

          <div className="flex flex-col sm:flex-row gap-3 w-full max-w-sm">
            <Button
              onClick={handleReset}
              className="flex-1 gap-2"
            >
              <IconArrowRight size={16} />
              Weitere Buchung
            </Button>
            <Button variant="outline" asChild className="flex-1">
              <a href="#/">Zurück zum Dashboard</a>
            </Button>
          </div>
        </div>
      )}
    </IntentWizardShell>
  );
}
