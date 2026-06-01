import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select, SelectContent, SelectItem,
  SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { DatePicker } from '@/components/DatePicker';
import { lookupKey, lookupKeys } from '@/lib/formatters';

// Empty PROXY_BASE → relative URLs (dashboard and form-proxy share the domain).
const PROXY_BASE = '';
const APP_ID = '69c64ca968df8b8b7588964b';
const SUBMIT_PATH = `/rest/apps/${APP_ID}/records`;
const ALTCHA_SCRIPT_SRC = 'https://cdn.jsdelivr.net/npm/altcha/dist/altcha.min.js';

async function submitPublicForm(fields: Record<string, unknown>, captchaToken: string) {
  const res = await fetch(`${PROXY_BASE}/api${SUBMIT_PATH}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Captcha-Token': captchaToken,
    },
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
  const captchaRef = useRef<HTMLElement | null>(null);

  // Load the ALTCHA web component script once per page.
  useEffect(() => {
    if (document.querySelector(`script[src="${ALTCHA_SCRIPT_SRC}"]`)) return;
    const s = document.createElement('script');
    s.src = ALTCHA_SCRIPT_SRC;
    s.defer = true;
    document.head.appendChild(s);
  }, []);

  useEffect(() => {
    const hash = window.location.hash;
    const qIdx = hash.indexOf('?');
    if (qIdx === -1) return;
    const params = new URLSearchParams(hash.slice(qIdx + 1));
    const prefill: Record<string, any> = {};
    params.forEach((value, key) => { prefill[key] = value; });
    if (Object.keys(prefill).length) setFields(prev => ({ ...prefill, ...prev }));
  }, []);

  function readCaptchaToken(): string | null {
    const el = captchaRef.current as any;
    if (!el) return null;
    return el.value || el.getAttribute('value') || null;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const token = readCaptchaToken();
    if (!token) {
      setError('Bitte warte auf die Spam-Prüfung und versuche es erneut.');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await submitPublicForm(cleanFields(fields), token);
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
              placeholder=""
              value={fields.kursname ?? ''}
              onChange={e => setFields(f => ({ ...f, kursname: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="yoga_stil">Yoga-Stil</Label>
            <Select
              value={lookupKey(fields.yoga_stil) ?? ''}
              onValueChange={v => setFields(f => ({ ...f, yoga_stil: v === 'none' ? undefined : v as any }))}
            >
              <SelectTrigger id="yoga_stil"><SelectValue placeholder="" /></SelectTrigger>
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
              placeholder=""
              value={fields.beschreibung ?? ''}
              onChange={e => setFields(f => ({ ...f, beschreibung: e.target.value }))}
              rows={3}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="niveau">Niveau</Label>
            <div role="radiogroup" className="flex flex-wrap gap-1.5">
              <button
                type="button"
                role="radio"
                aria-checked={lookupKey(fields.niveau) === 'anfaenger'}
                onClick={() => setFields(f => ({ ...f, niveau: (lookupKey(f.niveau) === 'anfaenger' ? undefined : 'anfaenger') as any }))}
                className={`inline-flex items-center rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${
                  lookupKey(fields.niveau) === 'anfaenger'
                    ? 'bg-foreground text-background border-foreground'
                    : 'bg-background text-foreground border-input hover:bg-accent'
                }`}
              >
                Anfänger
              </button>
              <button
                type="button"
                role="radio"
                aria-checked={lookupKey(fields.niveau) === 'fortgeschrittene'}
                onClick={() => setFields(f => ({ ...f, niveau: (lookupKey(f.niveau) === 'fortgeschrittene' ? undefined : 'fortgeschrittene') as any }))}
                className={`inline-flex items-center rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${
                  lookupKey(fields.niveau) === 'fortgeschrittene'
                    ? 'bg-foreground text-background border-foreground'
                    : 'bg-background text-foreground border-input hover:bg-accent'
                }`}
              >
                Fortgeschrittene
              </button>
              <button
                type="button"
                role="radio"
                aria-checked={lookupKey(fields.niveau) === 'alle'}
                onClick={() => setFields(f => ({ ...f, niveau: (lookupKey(f.niveau) === 'alle' ? undefined : 'alle') as any }))}
                className={`inline-flex items-center rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${
                  lookupKey(fields.niveau) === 'alle'
                    ? 'bg-foreground text-background border-foreground'
                    : 'bg-background text-foreground border-input hover:bg-accent'
                }`}
              >
                Alle Niveaus
              </button>
            </div>
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
              placeholder=""
              value={fields.uhrzeit ?? ''}
              onChange={e => setFields(f => ({ ...f, uhrzeit: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="dauer_minuten">Dauer (Minuten)</Label>
            <Input
              id="dauer_minuten"
              type="number"
              step="any"
              min={0}
              placeholder=""
              value={fields.dauer_minuten ?? ''}
              onChange={e => { const n = e.target.value ? Math.max(0, Number(e.target.value)) : undefined; setFields(f => ({ ...f, dauer_minuten: n })); }}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="startdatum">Startdatum</Label>
            <DatePicker
              id="startdatum"
              placeholder=""
              mode="date"
              value={fields.startdatum ?? null}
              onChange={v => setFields(f => ({ ...f, startdatum: v ?? undefined }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="enddatum">Enddatum</Label>
            <DatePicker
              id="enddatum"
              placeholder=""
              mode="date"
              value={fields.enddatum ?? null}
              onChange={v => setFields(f => ({ ...f, enddatum: v ?? undefined }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="raum">Raum / Ort</Label>
            <Input
              id="raum"
              placeholder=""
              value={fields.raum ?? ''}
              onChange={e => setFields(f => ({ ...f, raum: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="max_teilnehmer">Maximale Teilnehmerzahl</Label>
            <Input
              id="max_teilnehmer"
              type="number"
              step="any"
              min={0}
              placeholder=""
              value={fields.max_teilnehmer ?? ''}
              onChange={e => { const n = e.target.value ? Math.max(0, Number(e.target.value)) : undefined; setFields(f => ({ ...f, max_teilnehmer: n })); }}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="kursgebuehr">Kursgebühr (€)</Label>
            <Input
              id="kursgebuehr"
              type="number"
              step="any"
              min={0}
              placeholder=""
              value={fields.kursgebuehr ?? ''}
              onChange={e => { const n = e.target.value ? Math.max(0, Number(e.target.value)) : undefined; setFields(f => ({ ...f, kursgebuehr: n })); }}
            />
          </div>

          <altcha-widget
            ref={captchaRef as any}
            challengeurl={`${PROXY_BASE}/api/_challenge?path=${encodeURIComponent(SUBMIT_PATH)}`}
            auto="onsubmit"
            hidefooter
          />

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
