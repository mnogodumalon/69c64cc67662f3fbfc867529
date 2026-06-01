import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { lookupKeys } from '@/lib/formatters';

// Empty PROXY_BASE → relative URLs (dashboard and form-proxy share the domain).
const PROXY_BASE = '';
const APP_ID = '69c64ca4e8626bc986a4e869';
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

export default function PublicFormTrainer() {
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
          <h1 className="text-2xl font-bold text-foreground">Trainer — Formular</h1>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5 bg-card rounded-xl border border-border p-6 shadow-md">
          <div className="space-y-2">
            <Label htmlFor="nachname">Nachname</Label>
            <Input
              id="nachname"
              placeholder=""
              value={fields.nachname ?? ''}
              onChange={e => setFields(f => ({ ...f, nachname: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">E-Mail-Adresse</Label>
            <Input
              id="email"
              type="email"
              placeholder=""
              value={fields.email ?? ''}
              onChange={e => setFields(f => ({ ...f, email: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="telefon">Telefonnummer</Label>
            <Input
              id="telefon"
              value={fields.telefon ?? ''}
              onChange={e => setFields(f => ({ ...f, telefon: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="spezialisierungen">Yoga-Spezialisierungen</Label>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="spezialisierungen_hatha"
                  checked={lookupKeys(fields.spezialisierungen).includes('hatha')}
                  onCheckedChange={(checked) => {
                    setFields(f => {
                      const current = lookupKeys(f.spezialisierungen);
                      const next = checked ? [...current, 'hatha'] : current.filter(k => k !== 'hatha');
                      return { ...f, spezialisierungen: next.length ? next as any : undefined };
                    });
                  }}
                />
                <Label htmlFor="spezialisierungen_hatha" className="font-normal">Hatha Yoga</Label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="spezialisierungen_vinyasa"
                  checked={lookupKeys(fields.spezialisierungen).includes('vinyasa')}
                  onCheckedChange={(checked) => {
                    setFields(f => {
                      const current = lookupKeys(f.spezialisierungen);
                      const next = checked ? [...current, 'vinyasa'] : current.filter(k => k !== 'vinyasa');
                      return { ...f, spezialisierungen: next.length ? next as any : undefined };
                    });
                  }}
                />
                <Label htmlFor="spezialisierungen_vinyasa" className="font-normal">Vinyasa Yoga</Label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="spezialisierungen_yin"
                  checked={lookupKeys(fields.spezialisierungen).includes('yin')}
                  onCheckedChange={(checked) => {
                    setFields(f => {
                      const current = lookupKeys(f.spezialisierungen);
                      const next = checked ? [...current, 'yin'] : current.filter(k => k !== 'yin');
                      return { ...f, spezialisierungen: next.length ? next as any : undefined };
                    });
                  }}
                />
                <Label htmlFor="spezialisierungen_yin" className="font-normal">Yin Yoga</Label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="spezialisierungen_ashtanga"
                  checked={lookupKeys(fields.spezialisierungen).includes('ashtanga')}
                  onCheckedChange={(checked) => {
                    setFields(f => {
                      const current = lookupKeys(f.spezialisierungen);
                      const next = checked ? [...current, 'ashtanga'] : current.filter(k => k !== 'ashtanga');
                      return { ...f, spezialisierungen: next.length ? next as any : undefined };
                    });
                  }}
                />
                <Label htmlFor="spezialisierungen_ashtanga" className="font-normal">Ashtanga Yoga</Label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="spezialisierungen_kundalini"
                  checked={lookupKeys(fields.spezialisierungen).includes('kundalini')}
                  onCheckedChange={(checked) => {
                    setFields(f => {
                      const current = lookupKeys(f.spezialisierungen);
                      const next = checked ? [...current, 'kundalini'] : current.filter(k => k !== 'kundalini');
                      return { ...f, spezialisierungen: next.length ? next as any : undefined };
                    });
                  }}
                />
                <Label htmlFor="spezialisierungen_kundalini" className="font-normal">Kundalini Yoga</Label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="spezialisierungen_restorative"
                  checked={lookupKeys(fields.spezialisierungen).includes('restorative')}
                  onCheckedChange={(checked) => {
                    setFields(f => {
                      const current = lookupKeys(f.spezialisierungen);
                      const next = checked ? [...current, 'restorative'] : current.filter(k => k !== 'restorative');
                      return { ...f, spezialisierungen: next.length ? next as any : undefined };
                    });
                  }}
                />
                <Label htmlFor="spezialisierungen_restorative" className="font-normal">Restorative Yoga</Label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="spezialisierungen_power"
                  checked={lookupKeys(fields.spezialisierungen).includes('power')}
                  onCheckedChange={(checked) => {
                    setFields(f => {
                      const current = lookupKeys(f.spezialisierungen);
                      const next = checked ? [...current, 'power'] : current.filter(k => k !== 'power');
                      return { ...f, spezialisierungen: next.length ? next as any : undefined };
                    });
                  }}
                />
                <Label htmlFor="spezialisierungen_power" className="font-normal">Power Yoga</Label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="spezialisierungen_bikram"
                  checked={lookupKeys(fields.spezialisierungen).includes('bikram')}
                  onCheckedChange={(checked) => {
                    setFields(f => {
                      const current = lookupKeys(f.spezialisierungen);
                      const next = checked ? [...current, 'bikram'] : current.filter(k => k !== 'bikram');
                      return { ...f, spezialisierungen: next.length ? next as any : undefined };
                    });
                  }}
                />
                <Label htmlFor="spezialisierungen_bikram" className="font-normal">Bikram Yoga</Label>
              </div>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="ausbildung">Ausbildung & Zertifikate</Label>
            <Textarea
              id="ausbildung"
              placeholder=""
              value={fields.ausbildung ?? ''}
              onChange={e => setFields(f => ({ ...f, ausbildung: e.target.value }))}
              rows={3}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="erfahrung_jahre">Berufserfahrung (Jahre)</Label>
            <Input
              id="erfahrung_jahre"
              type="number"
              step="any"
              min={0}
              placeholder=""
              value={fields.erfahrung_jahre ?? ''}
              onChange={e => { const n = e.target.value ? Math.max(0, Number(e.target.value)) : undefined; setFields(f => ({ ...f, erfahrung_jahre: n })); }}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="biografie">Biografie</Label>
            <Textarea
              id="biografie"
              placeholder=""
              value={fields.biografie ?? ''}
              onChange={e => setFields(f => ({ ...f, biografie: e.target.value }))}
              rows={3}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="vorname">Vorname</Label>
            <Input
              id="vorname"
              placeholder=""
              value={fields.vorname ?? ''}
              onChange={e => setFields(f => ({ ...f, vorname: e.target.value }))}
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
