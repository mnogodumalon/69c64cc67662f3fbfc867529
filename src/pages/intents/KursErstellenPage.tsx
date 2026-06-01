import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { IntentWizardShell } from '@/components/IntentWizardShell';
import { EntitySelectStep } from '@/components/EntitySelectStep';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { useDashboardData } from '@/hooks/useDashboardData';
import { LivingAppsService, createRecordUrl } from '@/services/livingAppsService';
import { APP_IDS, LOOKUP_OPTIONS } from '@/types/app';
import type { Trainer } from '@/types/app';
import {
  IconUser,
  IconCalendar,
  IconClock,
  IconBook,
  IconCheck,
  IconPlus,
  IconMapPin,
  IconUsers,
  IconCurrencyEuro,
  IconArrowRight,
  IconArrowLeft,
  IconStar,
} from '@tabler/icons-react';

const WIZARD_STEPS = [
  { label: 'Kursdetails' },
  { label: 'Trainer' },
  { label: 'Zusammenfassung' },
];

interface KursFormState {
  kursname: string;
  yoga_stil: string;
  beschreibung: string;
  niveau: string;
  wochentag: string[];
  uhrzeit: string;
  dauer_minuten: string;
  startdatum: string;
  enddatum: string;
  raum: string;
  max_teilnehmer: string;
  kursgebuehr: string;
}

const INITIAL_FORM: KursFormState = {
  kursname: '',
  yoga_stil: '',
  beschreibung: '',
  niveau: '',
  wochentag: [],
  uhrzeit: '',
  dauer_minuten: '',
  startdatum: '',
  enddatum: '',
  raum: '',
  max_teilnehmer: '',
  kursgebuehr: '',
};

const yogaStilOptions = LOOKUP_OPTIONS['kurse']?.yoga_stil ?? [];
const niveauOptions = LOOKUP_OPTIONS['kurse']?.niveau ?? [];
const wochentagOptions = LOOKUP_OPTIONS['kurse']?.wochentag ?? [];

function getLabelForKey(options: { key: string; label: string }[], key: string): string {
  return options.find(o => o.key === key)?.label ?? key;
}

// Step 1: Kursdetails form
function KursdetailsStep({
  form,
  onChange,
  onNext,
}: {
  form: KursFormState;
  onChange: (partial: Partial<KursFormState>) => void;
  onNext: () => void;
}) {
  const canProceed =
    form.kursname.trim() !== '' &&
    form.yoga_stil !== '' &&
    form.niveau !== '' &&
    form.wochentag.length > 0 &&
    form.startdatum !== '' &&
    form.enddatum !== '';

  const toggleWochentag = (key: string) => {
    const current = form.wochentag;
    if (current.includes(key)) {
      onChange({ wochentag: current.filter(k => k !== key) });
    } else {
      onChange({ wochentag: [...current, key] });
    }
  };

  return (
    <div className="space-y-6">
      {/* Layout: form left, preview right on large screens */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Form */}
        <div className="lg:col-span-2 space-y-6">

          {/* Grunddaten */}
          <div className="rounded-2xl border bg-card overflow-hidden">
            <div className="px-5 py-4 border-b bg-secondary/30">
              <div className="flex items-center gap-2">
                <IconBook size={16} className="text-primary" />
                <h3 className="font-semibold text-sm">Grunddaten</h3>
              </div>
            </div>
            <div className="p-5 space-y-4">
              {/* Kursname */}
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-foreground">
                  Kursname <span className="text-destructive">*</span>
                </label>
                <Input
                  placeholder="z. B. Morgen-Yoga für Einsteiger"
                  value={form.kursname}
                  onChange={e => onChange({ kursname: e.target.value })}
                />
              </div>

              {/* Yoga-Stil Tiles */}
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-foreground">
                  Yoga-Stil <span className="text-destructive">*</span>
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {yogaStilOptions.map(opt => (
                    <button
                      key={opt.key}
                      type="button"
                      onClick={() => onChange({ yoga_stil: opt.key })}
                      className={`px-3 py-2 rounded-xl border text-sm font-medium transition-colors text-left truncate ${
                        form.yoga_stil === opt.key
                          ? 'bg-primary text-primary-foreground border-primary'
                          : 'bg-card border-border text-foreground hover:bg-accent hover:border-primary/30'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Niveau Tiles */}
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-foreground">
                  Niveau <span className="text-destructive">*</span>
                </label>
                <div className="flex flex-wrap gap-2">
                  {niveauOptions.map(opt => (
                    <button
                      key={opt.key}
                      type="button"
                      onClick={() => onChange({ niveau: opt.key })}
                      className={`px-4 py-2 rounded-xl border text-sm font-medium transition-colors ${
                        form.niveau === opt.key
                          ? 'bg-primary text-primary-foreground border-primary'
                          : 'bg-card border-border text-foreground hover:bg-accent hover:border-primary/30'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Beschreibung */}
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-foreground">Beschreibung</label>
                <Textarea
                  placeholder="Kurzbeschreibung des Kurses für Mitglieder..."
                  rows={3}
                  value={form.beschreibung}
                  onChange={e => onChange({ beschreibung: e.target.value })}
                />
              </div>
            </div>
          </div>

          {/* Zeitplan */}
          <div className="rounded-2xl border bg-card overflow-hidden">
            <div className="px-5 py-4 border-b bg-secondary/30">
              <div className="flex items-center gap-2">
                <IconClock size={16} className="text-primary" />
                <h3 className="font-semibold text-sm">Zeitplan</h3>
              </div>
            </div>
            <div className="p-5 space-y-4">
              {/* Wochentage */}
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-foreground">
                  Wochentage <span className="text-destructive">*</span>
                </label>
                <div className="flex flex-wrap gap-2">
                  {wochentagOptions.map(opt => (
                    <button
                      key={opt.key}
                      type="button"
                      onClick={() => toggleWochentag(opt.key)}
                      className={`px-3 py-2 rounded-xl border text-sm font-medium transition-colors ${
                        form.wochentag.includes(opt.key)
                          ? 'bg-primary text-primary-foreground border-primary'
                          : 'bg-card border-border text-foreground hover:bg-accent hover:border-primary/30'
                      }`}
                    >
                      {opt.label.slice(0, 2)}
                    </button>
                  ))}
                </div>
                {form.wochentag.length > 0 && (
                  <p className="text-xs text-muted-foreground">
                    Ausgewählt: {form.wochentag.map(k => getLabelForKey(wochentagOptions, k)).join(', ')}
                  </p>
                )}
              </div>

              {/* Uhrzeit + Dauer */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-foreground">Uhrzeit</label>
                  <div className="relative">
                    <IconClock size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      placeholder="09:00"
                      value={form.uhrzeit}
                      onChange={e => onChange({ uhrzeit: e.target.value })}
                      className="pl-9"
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-foreground">Dauer</label>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      min={15}
                      step={15}
                      placeholder="60"
                      value={form.dauer_minuten}
                      onChange={e => onChange({ dauer_minuten: e.target.value })}
                    />
                    <span className="text-sm text-muted-foreground shrink-0">Min.</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Zeitraum */}
          <div className="rounded-2xl border bg-card overflow-hidden">
            <div className="px-5 py-4 border-b bg-secondary/30">
              <div className="flex items-center gap-2">
                <IconCalendar size={16} className="text-primary" />
                <h3 className="font-semibold text-sm">Zeitraum</h3>
              </div>
            </div>
            <div className="p-5">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-foreground">
                    Startdatum <span className="text-destructive">*</span>
                  </label>
                  <Input
                    type="date"
                    value={form.startdatum}
                    onChange={e => onChange({ startdatum: e.target.value })}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-foreground">
                    Enddatum <span className="text-destructive">*</span>
                  </label>
                  <Input
                    type="date"
                    value={form.enddatum}
                    onChange={e => onChange({ enddatum: e.target.value })}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Kapazität & Kosten */}
          <div className="rounded-2xl border bg-card overflow-hidden">
            <div className="px-5 py-4 border-b bg-secondary/30">
              <div className="flex items-center gap-2">
                <IconUsers size={16} className="text-primary" />
                <h3 className="font-semibold text-sm">Kapazität &amp; Kosten</h3>
              </div>
            </div>
            <div className="p-5 space-y-4">
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-foreground">Raum</label>
                <div className="relative">
                  <IconMapPin size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="z. B. Yoga-Raum 1"
                    value={form.raum}
                    onChange={e => onChange({ raum: e.target.value })}
                    className="pl-9"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-foreground">Max. Teilnehmer</label>
                  <div className="relative">
                    <IconUsers size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      type="number"
                      min={1}
                      placeholder="15"
                      value={form.max_teilnehmer}
                      onChange={e => onChange({ max_teilnehmer: e.target.value })}
                      className="pl-9"
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-foreground">Kursgebühr</label>
                  <div className="flex items-center gap-2">
                    <div className="relative flex-1">
                      <IconCurrencyEuro size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        type="number"
                        min={0}
                        step={0.01}
                        placeholder="25,00"
                        value={form.kursgebuehr}
                        onChange={e => onChange({ kursgebuehr: e.target.value })}
                        className="pl-9"
                      />
                    </div>
                    <span className="text-sm text-muted-foreground shrink-0">€</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Live Preview Card */}
        <div className="lg:col-span-1">
          <div className="sticky top-4">
            <div className="rounded-2xl border bg-card overflow-hidden shadow-lg">
              <div className="px-4 py-3 border-b bg-primary/5">
                <p className="text-xs font-semibold text-primary uppercase tracking-wider">Vorschau</p>
              </div>
              <div className="p-4 space-y-3">
                <div>
                  <h4 className="font-bold text-foreground line-clamp-2 text-base">
                    {form.kursname || <span className="text-muted-foreground font-normal text-sm">Kursname noch nicht vergeben</span>}
                  </h4>
                  {form.yoga_stil && (
                    <span className="inline-block mt-1 text-xs bg-primary/10 text-primary font-medium px-2 py-0.5 rounded-full">
                      {getLabelForKey(yogaStilOptions, form.yoga_stil)}
                    </span>
                  )}
                </div>

                {form.niveau && (
                  <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                    <IconStar size={13} />
                    <span>{getLabelForKey(niveauOptions, form.niveau)}</span>
                  </div>
                )}

                {form.wochentag.length > 0 && (
                  <div className="flex items-start gap-1.5 text-sm text-muted-foreground">
                    <IconCalendar size={13} className="mt-0.5 shrink-0" />
                    <span className="text-xs">
                      {form.wochentag.map(k => getLabelForKey(wochentagOptions, k)).join(', ')}
                      {form.uhrzeit ? ` · ${form.uhrzeit} Uhr` : ''}
                      {form.dauer_minuten ? ` · ${form.dauer_minuten} Min.` : ''}
                    </span>
                  </div>
                )}

                {(form.startdatum || form.enddatum) && (
                  <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                    <IconCalendar size={13} className="shrink-0" />
                    <span className="text-xs">
                      {form.startdatum || '?'} – {form.enddatum || '?'}
                    </span>
                  </div>
                )}

                {form.raum && (
                  <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                    <IconMapPin size={13} />
                    <span className="text-xs truncate">{form.raum}</span>
                  </div>
                )}

                <div className="flex items-center justify-between pt-2 border-t">
                  {form.max_teilnehmer ? (
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <IconUsers size={12} />
                      <span>Max. {form.max_teilnehmer} TN</span>
                    </div>
                  ) : <span />}
                  {form.kursgebuehr && (
                    <span className="text-base font-bold text-primary">
                      {Number(form.kursgebuehr).toFixed(2)} €
                    </span>
                  )}
                </div>

                {form.beschreibung && (
                  <p className="text-xs text-muted-foreground line-clamp-3 pt-1 border-t">
                    {form.beschreibung}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex justify-end pt-2">
        <Button
          onClick={onNext}
          disabled={!canProceed}
          className="gap-2"
        >
          Weiter: Trainer zuweisen
          <IconArrowRight size={16} />
        </Button>
      </div>
      {!canProceed && (
        <p className="text-xs text-muted-foreground text-right -mt-2">
          Bitte fülle alle Pflichtfelder aus (Name, Stil, Niveau, Wochentag, Zeitraum).
        </p>
      )}
    </div>
  );
}

// Step 2: Trainer selection
function TrainerZuweisenStep({
  trainer,
  selectedTrainerId,
  onSelect,
  onBack,
  onNext,
}: {
  trainer: Trainer[];
  selectedTrainerId: string | null;
  onSelect: (id: string) => void;
  onBack: () => void;
  onNext: () => void;
}) {
  const selectedTrainer = trainer.find(t => t.record_id === selectedTrainerId) ?? null;

  return (
    <div className="space-y-5">
      <EntitySelectStep
        items={trainer.map(t => ({
          id: t.record_id,
          title: `${t.fields.vorname ?? ''} ${t.fields.nachname ?? ''}`.trim() || 'Unbekannt',
          subtitle: t.fields.spezialisierungen && t.fields.spezialisierungen.length > 0
            ? t.fields.spezialisierungen.map(s => s.label).join(' · ')
            : t.fields.email ?? '',
          stats: t.fields.erfahrung_jahre != null
            ? [{ label: 'Erfahrung', value: `${t.fields.erfahrung_jahre} Jahre` }]
            : [],
          icon: <IconUser size={20} className="text-primary" />,
        }))}
        onSelect={(id) => onSelect(id)}
        searchPlaceholder="Trainer suchen..."
        emptyIcon={<IconUser size={32} />}
        emptyText="Kein Trainer gefunden."
      />

      {selectedTrainer && (
        <div className="rounded-xl border bg-primary/5 border-primary/20 p-4 flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
            <IconCheck size={16} className="text-primary" />
          </div>
          <div className="min-w-0">
            <p className="font-medium text-sm text-foreground">
              {`${selectedTrainer.fields.vorname ?? ''} ${selectedTrainer.fields.nachname ?? ''}`.trim()} ausgewählt
            </p>
            {selectedTrainer.fields.spezialisierungen && selectedTrainer.fields.spezialisierungen.length > 0 && (
              <p className="text-xs text-muted-foreground truncate">
                {selectedTrainer.fields.spezialisierungen.map(s => s.label).join(', ')}
              </p>
            )}
          </div>
        </div>
      )}

      <div className="flex justify-between pt-2">
        <Button variant="outline" onClick={onBack} className="gap-2">
          <IconArrowLeft size={16} />
          Zurück
        </Button>
        <Button onClick={onNext} disabled={!selectedTrainerId} className="gap-2">
          Weiter: Zusammenfassung
          <IconArrowRight size={16} />
        </Button>
      </div>
    </div>
  );
}

// Step 3: Summary & Create
function ZusammenfassungStep({
  form,
  selectedTrainer,
  onBack,
  onSubmit,
  submitting,
  submitError,
  success,
  createdKursname,
  onReset,
}: {
  form: KursFormState;
  selectedTrainer: Trainer | null;
  onBack: () => void;
  onSubmit: () => void;
  submitting: boolean;
  submitError: string | null;
  success: boolean;
  createdKursname: string;
  onReset: () => void;
}) {
  if (success) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-6">
        <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center">
          <IconCheck size={30} className="text-green-600" stroke={2.5} />
        </div>
        <div className="text-center">
          <h2 className="text-xl font-bold text-foreground mb-1">Kurs erfolgreich erstellt!</h2>
          <p className="text-muted-foreground text-sm max-w-sm">
            <span className="font-medium text-foreground">{createdKursname}</span> wurde angelegt und ist bereit für Buchungen.
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3">
          <Button onClick={onReset} variant="outline" className="gap-2">
            <IconPlus size={16} />
            Weiteren Kurs erstellen
          </Button>
          <Button asChild>
            <a href="#/">Zurück zum Dashboard</a>
          </Button>
        </div>
      </div>
    );
  }

  const trainerName = selectedTrainer
    ? `${selectedTrainer.fields.vorname ?? ''} ${selectedTrainer.fields.nachname ?? ''}`.trim()
    : '—';

  return (
    <div className="space-y-5">
      <Card className="overflow-hidden">
        <CardContent className="p-0">
          {/* Header */}
          <div className="px-5 py-4 bg-secondary/30 border-b">
            <div className="flex items-center gap-2">
              <IconBook size={16} className="text-primary" />
              <h3 className="font-semibold text-sm">Kursdetails</h3>
            </div>
          </div>
          <div className="p-5 space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3">
              <SummaryRow label="Kursname" value={form.kursname} />
              <SummaryRow label="Yoga-Stil" value={getLabelForKey(yogaStilOptions, form.yoga_stil)} />
              <SummaryRow label="Niveau" value={getLabelForKey(niveauOptions, form.niveau)} />
              <SummaryRow
                label="Wochentage"
                value={form.wochentag.map(k => getLabelForKey(wochentagOptions, k)).join(', ')}
              />
              <SummaryRow label="Uhrzeit" value={form.uhrzeit ? `${form.uhrzeit} Uhr` : '—'} />
              <SummaryRow label="Dauer" value={form.dauer_minuten ? `${form.dauer_minuten} Minuten` : '—'} />
              <SummaryRow label="Startdatum" value={form.startdatum || '—'} />
              <SummaryRow label="Enddatum" value={form.enddatum || '—'} />
              <SummaryRow label="Raum" value={form.raum || '—'} />
              <SummaryRow label="Max. Teilnehmer" value={form.max_teilnehmer ? `${form.max_teilnehmer} Personen` : '—'} />
              <SummaryRow label="Kursgebühr" value={form.kursgebuehr ? `${Number(form.kursgebuehr).toFixed(2)} €` : '—'} />
            </div>
            {form.beschreibung && (
              <div className="pt-3 border-t">
                <p className="text-xs font-medium text-muted-foreground mb-1">Beschreibung</p>
                <p className="text-sm text-foreground">{form.beschreibung}</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Trainer */}
      <Card className="overflow-hidden">
        <CardContent className="p-0">
          <div className="px-5 py-4 bg-secondary/30 border-b">
            <div className="flex items-center gap-2">
              <IconUser size={16} className="text-primary" />
              <h3 className="font-semibold text-sm">Zugewiesener Trainer</h3>
            </div>
          </div>
          <div className="p-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <IconUser size={18} className="text-primary" />
              </div>
              <div className="min-w-0">
                <p className="font-medium text-foreground truncate">{trainerName}</p>
                {selectedTrainer?.fields.spezialisierungen && selectedTrainer.fields.spezialisierungen.length > 0 && (
                  <p className="text-xs text-muted-foreground truncate">
                    {selectedTrainer.fields.spezialisierungen.map(s => s.label).join(', ')}
                  </p>
                )}
                {selectedTrainer?.fields.erfahrung_jahre != null && (
                  <p className="text-xs text-muted-foreground">
                    {selectedTrainer.fields.erfahrung_jahre} Jahre Erfahrung
                  </p>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {submitError && (
        <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {submitError}
        </div>
      )}

      <div className="flex justify-between pt-2">
        <Button variant="outline" onClick={onBack} disabled={submitting} className="gap-2">
          <IconArrowLeft size={16} />
          Zurück
        </Button>
        <Button onClick={onSubmit} disabled={submitting} className="gap-2">
          {submitting ? (
            <>Wird erstellt...</>
          ) : (
            <>
              <IconCheck size={16} />
              Kurs erstellen
            </>
          )}
        </Button>
      </div>
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p className="text-sm text-foreground truncate">{value}</p>
    </div>
  );
}

// Main page component
export default function KursErstellenPage() {
  const [searchParams] = useSearchParams();
  const initialStep = (() => {
    const p = parseInt(searchParams.get('step') ?? '', 10);
    return p >= 1 && p <= 3 ? p : 1;
  })();

  const [currentStep, setCurrentStep] = useState(initialStep);
  const [form, setForm] = useState<KursFormState>(INITIAL_FORM);
  const [selectedTrainerId, setSelectedTrainerId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [createdKursname, setCreatedKursname] = useState('');

  const { trainer, loading, error, fetchAll } = useDashboardData();

  const handleFormChange = (partial: Partial<KursFormState>) => {
    setForm(prev => ({ ...prev, ...partial }));
  };

  const selectedTrainer = trainer.find(t => t.record_id === selectedTrainerId) ?? null;

  const handleSubmit = async () => {
    setSubmitting(true);
    setSubmitError(null);
    try {
      await LivingAppsService.createKurseEntry({
        kursname: form.kursname,
        yoga_stil: form.yoga_stil || undefined,
        beschreibung: form.beschreibung || undefined,
        niveau: form.niveau || undefined,
        wochentag: form.wochentag.length > 0 ? form.wochentag : undefined,
        uhrzeit: form.uhrzeit || undefined,
        dauer_minuten: form.dauer_minuten ? Number(form.dauer_minuten) : undefined,
        startdatum: form.startdatum || undefined,
        enddatum: form.enddatum || undefined,
        raum: form.raum || undefined,
        max_teilnehmer: form.max_teilnehmer ? Number(form.max_teilnehmer) : undefined,
        kursgebuehr: form.kursgebuehr ? Number(form.kursgebuehr) : undefined,
        trainer: selectedTrainerId
          ? createRecordUrl(APP_IDS.TRAINER, selectedTrainerId)
          : undefined,
      });
      setCreatedKursname(form.kursname);
      setSuccess(true);
      void fetchAll();
    } catch (err) {
      setSubmitError(
        err instanceof Error ? err.message : 'Fehler beim Erstellen des Kurses. Bitte versuche es erneut.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleReset = () => {
    setForm(INITIAL_FORM);
    setSelectedTrainerId(null);
    setSuccess(false);
    setSubmitError(null);
    setCreatedKursname('');
    setCurrentStep(1);
  };

  return (
    <IntentWizardShell
      title="Neuen Kurs erstellen"
      subtitle="Leg einen neuen Yoga-Kurs an und weise einen Trainer zu."
      steps={WIZARD_STEPS}
      currentStep={currentStep}
      onStepChange={setCurrentStep}
      loading={loading}
      error={error}
      onRetry={fetchAll}
    >
      {currentStep === 1 && (
        <KursdetailsStep
          form={form}
          onChange={handleFormChange}
          onNext={() => setCurrentStep(2)}
        />
      )}

      {currentStep === 2 && (
        <TrainerZuweisenStep
          trainer={trainer}
          selectedTrainerId={selectedTrainerId}
          onSelect={(id) => setSelectedTrainerId(id)}
          onBack={() => setCurrentStep(1)}
          onNext={() => setCurrentStep(3)}
        />
      )}

      {currentStep === 3 && (
        <ZusammenfassungStep
          form={form}
          selectedTrainer={selectedTrainer}
          onBack={() => setCurrentStep(2)}
          onSubmit={handleSubmit}
          submitting={submitting}
          submitError={submitError}
          success={success}
          createdKursname={createdKursname}
          onReset={handleReset}
        />
      )}
    </IntentWizardShell>
  );
}
