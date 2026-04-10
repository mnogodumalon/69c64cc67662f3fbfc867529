import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { IconFileText, IconUpload } from '@tabler/icons-react';
import { lookupKeys } from '@/lib/formatters';

const KLAR_BASE = 'http://localhost:8000/claude';

async function submitPublicForm(fields: Record<string, unknown>) {
  const res = await fetch(`${KLAR_BASE}/public/69c64cc67662f3fbfc867529/69c64ca4e8626bc986a4e869/submit`, {
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

async function publicUploadFile(file: File): Promise<string> {
  const fd = new FormData();
  fd.append('file', file, file.name);
  const res = await fetch(`${KLAR_BASE}/public/69c64cc67662f3fbfc867529/upload`, {
    method: 'POST',
    body: fd,
  });
  if (!res.ok) throw new Error('Upload failed');
  const data = await res.json();
  return data.url;
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
  const [fileUploading, setFileUploading] = useState(false);

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
          <h1 className="text-2xl font-bold text-foreground">Trainer — Formular</h1>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5 bg-card rounded-xl border border-border p-6 shadow-md">
          <div className="space-y-2">
            <Label htmlFor="nachname">Nachname</Label>
            <Input
              id="nachname"
              value={fields.nachname ?? ''}
              onChange={e => setFields(f => ({ ...f, nachname: e.target.value }))}
            />
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
              value={fields.erfahrung_jahre ?? ''}
              onChange={e => setFields(f => ({ ...f, erfahrung_jahre: e.target.value ? Number(e.target.value) : undefined }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="biografie">Biografie</Label>
            <Textarea
              id="biografie"
              value={fields.biografie ?? ''}
              onChange={e => setFields(f => ({ ...f, biografie: e.target.value }))}
              rows={3}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="foto">Foto</Label>
            {fields.foto ? (
              <div className="flex items-center gap-3 rounded-lg border p-2">
                <div className="relative h-14 w-14 shrink-0 rounded-md bg-muted overflow-hidden">
                  <div className="absolute inset-0 flex items-center justify-center">
                    <IconFileText size={20} className="text-muted-foreground" />
                  </div>
                  <img
                    src={fields.foto}
                    alt=""
                    className="relative h-full w-full object-cover"
                    onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm truncate text-foreground">{fields.foto.split("/").pop()}</p>
                  <div className="flex gap-2 mt-1">
                    <label
                      className="text-xs text-primary hover:underline cursor-pointer"
                    >
                      Ändern
                      <input
                        type="file"
                        accept="image/*,.pdf"
                        className="hidden"
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          try {
                            const fileUrl = await publicUploadFile(file);
                            setFields(f => ({ ...f, foto: fileUrl }));
                          } catch (err) { console.error('Upload failed:', err); }
                        }}
                      />
                    </label>
                    <button
                      type="button"
                      className="text-xs text-muted-foreground hover:text-destructive"
                      onClick={() => setFields(f => ({ ...f, foto: undefined }))}
                    >
                      Entfernen
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <label
                className="flex flex-col items-center justify-center gap-1.5 rounded-lg border-2 border-dashed border-muted-foreground/25 p-4 cursor-pointer hover:border-primary/50 hover:bg-muted/50 transition-colors"
              >
                <IconUpload size={20} className="text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Datei hochladen</span>
                <input
                  type="file"
                  accept="image/*,.pdf"
                  className="hidden"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    try {
                      const fileUrl = await publicUploadFile(file);
                      setFields(f => ({ ...f, foto: fileUrl }));
                    } catch (err) { console.error('Upload failed:', err); }
                  }}
                />
              </label>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="vorname">Vorname</Label>
            <Input
              id="vorname"
              value={fields.vorname ?? ''}
              onChange={e => setFields(f => ({ ...f, vorname: e.target.value }))}
            />
          </div>

          {error && (
            <div className="text-sm text-destructive bg-destructive/10 rounded-lg p-3">
              {error}
            </div>
          )}

          <Button type="submit" className="w-full" disabled={submitting || fileUploading}>
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
