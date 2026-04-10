import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select, SelectContent, SelectItem,
  SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { lookupKey, lookupKeys } from '@/lib/formatters';

const KLAR_BASE = 'https://my.living-apps.de/claude';

async function submitPublicForm(fields: Record<string, unknown>) {
  const res = await fetch(`${KLAR_BASE}/public/69c64cc67662f3fbfc867529/69c64ca968df8b8b7588964b/submit`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fields }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(err || 'Submission failed');
  }
  return res.json();
}


function cleanFields(fields: Record<string, unknown>): Record<string, unknown> {
  const cleaned: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(fields)) {
    if (value == null) continue;
    if (typeof value === 'object' && !Array.isArray(value) && 'key' in (value as any)) {
      cleaned[key] = (value as any).key;
    } else if (Array.isArray(value)) {
      cleaned[key] = value.map(item =>
        typeof item === 'object' && item !== null && 'key' in item ? item.key : item
      );
    } else {
      cleaned[key] = value;
    }
  }
  return cleaned;
}

export default function PublicFormKurse() {
  const [fields, setFields] = useState<Record<string, any>>({});
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const hash = window.location.hash;
    const qIdx = hash.indexOf('?');
    if (qIdx === -1) return;
    const params = new URLSearchParams(hash.slice(qIdx + 1));
    const prefill: Record<string, any> = {};
    params.forEach((value, key) => { prefill[key] = value; });
    if (Object.keys(prefill).length) setFields(prev => ({ ...prefill, ...prev }));
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await submitPublicForm(cleanFields(fields));
      setSubmitted(true);
    } catch (err: any) {
      setError(err.message || 'Etwas ist schiefgelaufen. Bitte versuche es erneut.');
    } finally {
      setSubmitting(false);
    }
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center space-y-4 max-w-md">
          <div className="h-16 w-16 mx-auto rounded-full bg-primary/10 flex items-center justify-center">
            <svg className="h-8 w-8 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-xl font-bold">Vielen Dank!</h2>
          <p className="text-muted-foreground">Deine Eingabe wurde erfolgreich übermittelt.</p>
          <Button variant="outline" className="mt-4" onClick={() => { setSubmitted(false); setFields({}); }}>
            Weitere Eingabe
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-foreground">Kurse — Formular</h1>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5 bg-card rounded-xl border border-border p-6 shadow-md">
          <div className="space-y-2">
            <Label htmlFor="kursname">Kursname</Label>
            <Input
              id="kursname"
              value={fields.kursname ?? ''}
              onChange={e => setFields(f => ({ ...f, kursname: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="yoga_stil">Yoga-Stil</Label>
            <Select
              value={lookupKey(fields.yoga_stil) ?? 'none'}
              onValueChange={v => setFields(f => ({ ...f, yoga_stil: v === 'none' ? undefined : v as any }))}
            >
              <SelectTrigger id="yoga_stil"><SelectValue placeholder="Auswählen..." /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">—</SelectItem>
                <SelectItem value="hatha">Hatha Yoga</SelectItem>
                <SelectItem value="vinyasa">Vinyasa Yoga</SelectItem>
                <SelectItem value="yin">Yin Yoga</SelectItem>
                <SelectItem value="ashtanga">Ashtanga Yoga</SelectItem>
                <SelectItem value="kundalini">Kundalini Yoga</SelectItem>
                <SelectItem value="restorative">Restorative Yoga</SelectItem>
                <SelectItem value="power">Power Yoga</SelectItem>
                <SelectItem value="bikram">Bikram Yoga</SelectItem>
                <SelectItem value="sonstiges">Sonstiges</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="beschreibung">Kursbeschreibung</Label>
            <Textarea
              id="beschreibung"
              value={fields.beschreibung ?? ''}
              onChange={e => setFields(f => ({ ...f, beschreibung: e.target.value }))}
              rows={3}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="niveau">Niveau</Label>
            <Select
              value={lookupKey(fields.niveau) ?? 'none'}
              onValueChange={v => setFields(f => ({ ...f, niveau: v === 'none' ? undefined : v as any }))}
            >
              <SelectTrigger id="niveau"><SelectValue placeholder="Auswählen..." /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">—</SelectItem>
                <SelectItem value="anfaenger">Anfänger</SelectItem>
                <SelectItem value="fortgeschrittene">Fortgeschrittene</SelectItem>
                <SelectItem value="alle">Alle Niveaus</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="wochentag">Wochentag(e)</Label>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="wochentag_montag"
                  checked={lookupKeys(fields.wochentag).includes('montag')}
                  onCheckedChange={(checked) => {
                    setFields(f => {
                      const current = lookupKeys(f.wochentag);
                      const next = checked ? [...current, 'montag'] : current.filter(k => k !== 'montag');
                      return { ...f, wochentag: next.length ? next as any : undefined };
                    });
                  }}
                />
                <Label htmlFor="wochentag_montag" className="font-normal">Montag</Label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="wochentag_dienstag"
                  checked={lookupKeys(fields.wochentag).includes('dienstag')}
                  onCheckedChange={(checked) => {
                    setFields(f => {
                      const current = lookupKeys(f.wochentag);
                      const next = checked ? [...current, 'dienstag'] : current.filter(k => k !== 'dienstag');
                      return { ...f, wochentag: next.length ? next as any : undefined };
                    });
                  }}
                />
                <Label htmlFor="wochentag_dienstag" className="font-normal">Dienstag</Label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="wochentag_mittwoch"
                  checked={lookupKeys(fields.wochentag).includes('mittwoch')}
                  onCheckedChange={(checked) => {
                    setFields(f => {
                      const current = lookupKeys(f.wochentag);
                      const next = checked ? [...current, 'mittwoch'] : current.filter(k => k !== 'mittwoch');
                      return { ...f, wochentag: next.length ? next as any : undefined };
                    });
                  }}
                />
                <Label htmlFor="wochentag_mittwoch" className="font-normal">Mittwoch</Label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="wochentag_donnerstag"
                  checked={lookupKeys(fields.wochentag).includes('donnerstag')}
                  onCheckedChange={(checked) => {
                    setFields(f => {
                      const current = lookupKeys(f.wochentag);
                      const next = checked ? [...current, 'donnerstag'] : current.filter(k => k !== 'donnerstag');
                      return { ...f, wochentag: next.length ? next as any : undefined };
                    });
                  }}
                />
                <Label htmlFor="wochentag_donnerstag" className="font-normal">Donnerstag</Label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="wochentag_freitag"
                  checked={lookupKeys(fields.wochentag).includes('freitag')}
                  onCheckedChange={(checked) => {
                    setFields(f => {
                      const current = lookupKeys(f.wochentag);
                      const next = checked ? [...current, 'freitag'] : current.filter(k => k !== 'freitag');
                      return { ...f, wochentag: next.length ? next as any : undefined };
                    });
                  }}
                />
                <Label htmlFor="wochentag_freitag" className="font-normal">Freitag</Label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="wochentag_samstag"
                  checked={lookupKeys(fields.wochentag).includes('samstag')}
                  onCheckedChange={(checked) => {
                    setFields(f => {
                      const current = lookupKeys(f.wochentag);
                      const next = checked ? [...current, 'samstag'] : current.filter(k => k !== 'samstag');
                      return { ...f, wochentag: next.length ? next as any : undefined };
                    });
                  }}
                />
                <Label htmlFor="wochentag_samstag" className="font-normal">Samstag</Label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="wochentag_sonntag"
                  checked={lookupKeys(fields.wochentag).includes('sonntag')}
                  onCheckedChange={(checked) => {
                    setFields(f => {
                      const current = lookupKeys(f.wochentag);
                      const next = checked ? [...current, 'sonntag'] : current.filter(k => k !== 'sonntag');
                      return { ...f, wochentag: next.length ? next as any : undefined };
                    });
                  }}
                />
                <Label htmlFor="wochentag_sonntag" className="font-normal">Sonntag</Label>
              </div>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="uhrzeit">Uhrzeit</Label>
            <Input
              id="uhrzeit"
              value={fields.uhrzeit ?? ''}
              onChange={e => setFields(f => ({ ...f, uhrzeit: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="dauer_minuten">Dauer (Minuten)</Label>
            <Input
              id="dauer_minuten"
              type="number"
              value={fields.dauer_minuten ?? ''}
              onChange={e => setFields(f => ({ ...f, dauer_minuten: e.target.value ? Number(e.target.value) : undefined }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="startdatum">Startdatum</Label>
            <Input
              id="startdatum"
              type="date"
              value={fields.startdatum ?? ''}
              onChange={e => setFields(f => ({ ...f, startdatum: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="enddatum">Enddatum</Label>
            <Input
              id="enddatum"
              type="date"
              value={fields.enddatum ?? ''}
              onChange={e => setFields(f => ({ ...f, enddatum: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="raum">Raum / Ort</Label>
            <Input
              id="raum"
              value={fields.raum ?? ''}
              onChange={e => setFields(f => ({ ...f, raum: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="max_teilnehmer">Maximale Teilnehmerzahl</Label>
            <Input
              id="max_teilnehmer"
              type="number"
              value={fields.max_teilnehmer ?? ''}
              onChange={e => setFields(f => ({ ...f, max_teilnehmer: e.target.value ? Number(e.target.value) : undefined }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="kursgebuehr">Kursgebühr (€)</Label>
            <Input
              id="kursgebuehr"
              type="number"
              value={fields.kursgebuehr ?? ''}
              onChange={e => setFields(f => ({ ...f, kursgebuehr: e.target.value ? Number(e.target.value) : undefined }))}
            />
          </div>

          {error && (
            <div className="text-sm text-destructive bg-destructive/10 rounded-lg p-3">
              {error}
            </div>
          )}

          <Button type="submit" className="w-full" disabled={submitting}>
            {submitting ? 'Wird gesendet...' : 'Absenden'}
          </Button>
        </form>

        <p className="text-xs text-muted-foreground text-center mt-4">
          Powered by Klar
        </p>
      </div>
    </div>
  );
}
