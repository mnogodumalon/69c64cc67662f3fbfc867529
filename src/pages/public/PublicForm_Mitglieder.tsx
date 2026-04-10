import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select, SelectContent, SelectItem,
  SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { lookupKey } from '@/lib/formatters';

const KLAR_BASE = 'http://localhost:8000/claude';

async function submitPublicForm(fields: Record<string, unknown>) {
  const res = await fetch(`${KLAR_BASE}/public/69c64cc67662f3fbfc867529/69c64ca94239a6f64d141247/submit`, {
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

export default function PublicFormMitglieder() {
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
          <h1 className="text-2xl font-bold text-foreground">Mitglieder — Formular</h1>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5 bg-card rounded-xl border border-border p-6 shadow-md">
          <div className="space-y-2">
            <Label htmlFor="vorname">Vorname</Label>
            <Input
              id="vorname"
              value={fields.vorname ?? ''}
              onChange={e => setFields(f => ({ ...f, vorname: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="nachname">Nachname</Label>
            <Input
              id="nachname"
              value={fields.nachname ?? ''}
              onChange={e => setFields(f => ({ ...f, nachname: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="geburtsdatum">Geburtsdatum</Label>
            <Input
              id="geburtsdatum"
              type="date"
              value={fields.geburtsdatum ?? ''}
              onChange={e => setFields(f => ({ ...f, geburtsdatum: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="geschlecht">Geschlecht</Label>
            <Select
              value={lookupKey(fields.geschlecht) ?? 'none'}
              onValueChange={v => setFields(f => ({ ...f, geschlecht: v === 'none' ? undefined : v as any }))}
            >
              <SelectTrigger id="geschlecht"><SelectValue placeholder="Auswählen..." /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">—</SelectItem>
                <SelectItem value="weiblich">Weiblich</SelectItem>
                <SelectItem value="maennlich">Männlich</SelectItem>
                <SelectItem value="divers">Divers</SelectItem>
                <SelectItem value="keine_angabe">Keine Angabe</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">E-Mail-Adresse</Label>
            <Input
              id="email"
              type="email"
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
            <Label htmlFor="strasse">Straße</Label>
            <Input
              id="strasse"
              value={fields.strasse ?? ''}
              onChange={e => setFields(f => ({ ...f, strasse: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="hausnummer">Hausnummer</Label>
            <Input
              id="hausnummer"
              value={fields.hausnummer ?? ''}
              onChange={e => setFields(f => ({ ...f, hausnummer: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="postleitzahl">Postleitzahl</Label>
            <Input
              id="postleitzahl"
              value={fields.postleitzahl ?? ''}
              onChange={e => setFields(f => ({ ...f, postleitzahl: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="stadt">Stadt</Label>
            <Input
              id="stadt"
              value={fields.stadt ?? ''}
              onChange={e => setFields(f => ({ ...f, stadt: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="mitgliedschaft_typ">Mitgliedschaftstyp</Label>
            <Select
              value={lookupKey(fields.mitgliedschaft_typ) ?? 'none'}
              onValueChange={v => setFields(f => ({ ...f, mitgliedschaft_typ: v === 'none' ? undefined : v as any }))}
            >
              <SelectTrigger id="mitgliedschaft_typ"><SelectValue placeholder="Auswählen..." /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">—</SelectItem>
                <SelectItem value="einzelstunde">Einzelstunde</SelectItem>
                <SelectItem value="zehnerkarte">10er-Karte</SelectItem>
                <SelectItem value="monat">Monatsmitgliedschaft</SelectItem>
                <SelectItem value="jahr">Jahresmitgliedschaft</SelectItem>
                <SelectItem value="schnupperkurs">Schnupperkurs</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="mitglied_seit">Mitglied seit</Label>
            <Input
              id="mitglied_seit"
              type="date"
              value={fields.mitglied_seit ?? ''}
              onChange={e => setFields(f => ({ ...f, mitglied_seit: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="notfall_vorname">Notfallkontakt Vorname</Label>
            <Input
              id="notfall_vorname"
              value={fields.notfall_vorname ?? ''}
              onChange={e => setFields(f => ({ ...f, notfall_vorname: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="notfall_nachname">Notfallkontakt Nachname</Label>
            <Input
              id="notfall_nachname"
              value={fields.notfall_nachname ?? ''}
              onChange={e => setFields(f => ({ ...f, notfall_nachname: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="notfall_telefon">Notfallkontakt Telefon</Label>
            <Input
              id="notfall_telefon"
              value={fields.notfall_telefon ?? ''}
              onChange={e => setFields(f => ({ ...f, notfall_telefon: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="gesundheitshinweise">Gesundheitliche Hinweise / Einschränkungen</Label>
            <Textarea
              id="gesundheitshinweise"
              value={fields.gesundheitshinweise ?? ''}
              onChange={e => setFields(f => ({ ...f, gesundheitshinweise: e.target.value }))}
              rows={3}
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
