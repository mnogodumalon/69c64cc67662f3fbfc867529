import { useState, useEffect, useRef, useCallback } from 'react';
import type { Kurse, Trainer } from '@/types/app';
import { APP_IDS } from '@/types/app';
import { extractRecordId, createRecordUrl, cleanFieldsForApi, getUserProfile } from '@/services/livingAppsService';
import {
  Dialog, DialogContent, DialogHeader,
  DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select, SelectContent, SelectItem,
  SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { IconCamera, IconCircleCheck, IconClipboard, IconFileText, IconLoader2, IconPhotoPlus, IconSparkles, IconUpload, IconX } from '@tabler/icons-react';
import { fileToDataUri, extractFromInput, extractPhotoMeta, reverseGeocode } from '@/lib/ai';
import { lookupKey, lookupKeys } from '@/lib/formatters';

interface KurseDialogProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (fields: Kurse['fields']) => Promise<void>;
  defaultValues?: Kurse['fields'];
  trainerList: Trainer[];
  enablePhotoScan?: boolean;
  enablePhotoLocation?: boolean;
}

export function KurseDialog({ open, onClose, onSubmit, defaultValues, trainerList, enablePhotoScan = true, enablePhotoLocation = true }: KurseDialogProps) {
  const [fields, setFields] = useState<Partial<Kurse['fields']>>({});
  const [saving, setSaving] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [scanSuccess, setScanSuccess] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const [usePersonalInfo, setUsePersonalInfo] = useState(() => {
    try { return localStorage.getItem('ai-use-personal-info') === 'true'; } catch { return false; }
  });
  const [showProfileInfo, setShowProfileInfo] = useState(false);
  const [profileData, setProfileData] = useState<Record<string, unknown> | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [aiText, setAiText] = useState('');

  useEffect(() => {
    if (open) {
      setFields(defaultValues ?? {});
      setPreview(null);
      setScanSuccess(false);
      setAiText('');
    }
  }, [open, defaultValues]);
  useEffect(() => {
    try { localStorage.setItem('ai-use-personal-info', String(usePersonalInfo)); } catch {}
  }, [usePersonalInfo]);
  async function handleShowProfileInfo() {
    if (showProfileInfo) { setShowProfileInfo(false); return; }
    setProfileLoading(true);
    try {
      const p = await getUserProfile();
      setProfileData(p);
    } catch {
      setProfileData(null);
    } finally {
      setProfileLoading(false);
      setShowProfileInfo(true);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const clean = cleanFieldsForApi({ ...fields }, 'kurse');
      await onSubmit(clean as Kurse['fields']);
      onClose();
    } finally {
      setSaving(false);
    }
  }

  async function handleAiExtract(file?: File) {
    if (!file && !aiText.trim()) return;
    setScanning(true);
    setScanSuccess(false);
    try {
      let uri: string | undefined;
      let gps: { latitude: number; longitude: number } | null = null;
      let geoAddr = '';
      const parts: string[] = [];
      if (file) {
        const [dataUri, meta] = await Promise.all([fileToDataUri(file), extractPhotoMeta(file)]);
        uri = dataUri;
        if (file.type.startsWith('image/')) setPreview(uri);
        gps = enablePhotoLocation ? meta?.gps ?? null : null;
        if (gps) {
          geoAddr = await reverseGeocode(gps.latitude, gps.longitude);
          parts.push(`Location coordinates: ${gps.latitude}, ${gps.longitude}`);
          if (geoAddr) parts.push(`Reverse-geocoded address: ${geoAddr}`);
        }
        if (meta?.dateTime) {
          parts.push(`Date taken: ${meta.dateTime.replace(/^(\d{4}):(\d{2}):(\d{2})/, '$1-$2-$3')}`);
        }
      }
      const contextParts: string[] = [];
      if (parts.length) {
        contextParts.push(`<photo-metadata>\nThe following metadata was extracted from the photo\'s EXIF data:\n${parts.join('\n')}\n</photo-metadata>`);
      }
      contextParts.push(`<available-records field="trainer" entity="Trainer">\n${JSON.stringify(trainerList.map(r => ({ record_id: r.record_id, ...r.fields })), null, 2)}\n</available-records>`);
      if (usePersonalInfo) {
        try {
          const profile = await getUserProfile();
          contextParts.push(`<user-profile>\nThe following is the logged-in user\'s personal information. Use this to pre-fill relevant fields like name, email, address, company etc. when appropriate:\n${JSON.stringify(profile, null, 2)}\n</user-profile>`);
        } catch (err) {
          console.warn('Failed to fetch user profile:', err);
        }
      }
      const photoContext = contextParts.length ? contextParts.join('\n') : undefined;
      const schema = `{\n  "kursname": string | null, // Kursname\n  "yoga_stil": LookupValue | null, // Yoga-Stil (select one key: "hatha" | "vinyasa" | "yin" | "ashtanga" | "kundalini" | "restorative" | "power" | "bikram" | "sonstiges") mapping: hatha=Hatha Yoga, vinyasa=Vinyasa Yoga, yin=Yin Yoga, ashtanga=Ashtanga Yoga, kundalini=Kundalini Yoga, restorative=Restorative Yoga, power=Power Yoga, bikram=Bikram Yoga, sonstiges=Sonstiges\n  "beschreibung": string | null, // Kursbeschreibung\n  "niveau": LookupValue | null, // Niveau (select one key: "anfaenger" | "fortgeschrittene" | "alle") mapping: anfaenger=Anfänger, fortgeschrittene=Fortgeschrittene, alle=Alle Niveaus\n  "wochentag": LookupValue[] | null, // Wochentag(e) (select one or more keys: "montag" | "dienstag" | "mittwoch" | "donnerstag" | "freitag" | "samstag" | "sonntag") mapping: montag=Montag, dienstag=Dienstag, mittwoch=Mittwoch, donnerstag=Donnerstag, freitag=Freitag, samstag=Samstag, sonntag=Sonntag\n  "uhrzeit": string | null, // Uhrzeit\n  "dauer_minuten": number | null, // Dauer (Minuten)\n  "startdatum": string | null, // YYYY-MM-DD\n  "enddatum": string | null, // YYYY-MM-DD\n  "raum": string | null, // Raum / Ort\n  "max_teilnehmer": number | null, // Maximale Teilnehmerzahl\n  "kursgebuehr": number | null, // Kursgebühr (€)\n  "trainer": string | null, // Display name from Trainer (see <available-records>)\n}`;
      const raw = await extractFromInput<Record<string, unknown>>(schema, {
        dataUri: uri,
        userText: aiText.trim() || undefined,
        photoContext,
        intent: DIALOG_INTENT,
      });
      setFields(prev => {
        const merged = { ...prev } as Record<string, unknown>;
        function matchName(name: string, candidates: string[]): boolean {
          const n = name.toLowerCase().trim();
          return candidates.some(c => c.toLowerCase().includes(n) || n.includes(c.toLowerCase()));
        }
        const applookupKeys = new Set<string>(["trainer"]);
        for (const [k, v] of Object.entries(raw)) {
          if (applookupKeys.has(k)) continue;
          if (v != null) merged[k] = v;
        }
        const trainerName = raw['trainer'] as string | null;
        if (trainerName) {
          const trainerMatch = trainerList.find(r => matchName(trainerName!, [[r.fields.vorname ?? '', r.fields.nachname ?? ''].filter(Boolean).join(' ')]));
          if (trainerMatch) merged['trainer'] = createRecordUrl(APP_IDS.TRAINER, trainerMatch.record_id);
        }
        return merged as Partial<Kurse['fields']>;
      });
      setAiText('');
      setScanSuccess(true);
      setTimeout(() => setScanSuccess(false), 3000);
    } catch (err) {
      console.error('Scan fehlgeschlagen:', err);
      alert(err instanceof Error ? err.message : String(err));
    } finally {
      setScanning(false);
    }
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (f) handleAiExtract(f);
    e.target.value = '';
  }

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file && (file.type.startsWith('image/') || file.type === 'application/pdf')) {
      handleAiExtract(file);
    }
  }, []);

  const DIALOG_INTENT = defaultValues ? 'Kurse bearbeiten' : 'Kurse hinzufügen';

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{DIALOG_INTENT}</DialogTitle>
        </DialogHeader>

        {enablePhotoScan && (
          <div className="rounded-lg border bg-muted/30 p-4 space-y-3">
            <div>
              <div className="flex items-center gap-1.5 font-medium">
                <IconSparkles className="h-4 w-4 text-primary" />
                KI-Assistent
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">Versteht Fotos, Dokumente und Text und füllt alles für dich aus</p>
            </div>
            <div className="flex items-start gap-2 pl-0.5">
              <Checkbox
                id="ai-use-personal-info"
                checked={usePersonalInfo}
                onCheckedChange={(v) => setUsePersonalInfo(!!v)}
                className="mt-0.5"
              />
              <span className="text-xs text-muted-foreground leading-snug">
                <Label htmlFor="ai-use-personal-info" className="text-xs font-normal text-muted-foreground cursor-pointer inline">
                  KI-Assistent darf zusätzlich Informationen zu meiner Person verwenden
                </Label>
                {' '}
                <button type="button" onClick={handleShowProfileInfo} className="text-xs text-primary hover:underline whitespace-nowrap">
                  {profileLoading ? 'Lade...' : '(mehr Infos)'}
                </button>
              </span>
            </div>
            {showProfileInfo && (
              <div className="rounded-md border bg-muted/50 p-2 text-xs max-h-40 overflow-y-auto">
                <p className="font-medium mb-1">Folgende Infos über dich können von der KI genutzt werden:</p>
                {profileData ? Object.values(profileData).map((v, i) => (
                  <span key={i}>{i > 0 && ", "}{typeof v === "object" ? JSON.stringify(v) : String(v)}</span>
                )) : (
                  <span className="text-muted-foreground">Profil konnte nicht geladen werden</span>
                )}
              </div>
            )}

            <input ref={fileInputRef} type="file" accept="image/*,application/pdf" className="hidden" onChange={handleFileSelect} />
            <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleFileSelect} />

            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => !scanning && fileInputRef.current?.click()}
              className={`
                relative rounded-xl border-2 border-dashed transition-all duration-200 cursor-pointer
                ${scanning
                  ? 'border-primary/40 bg-primary/5'
                  : scanSuccess
                    ? 'border-green-500/40 bg-green-50/50 dark:bg-green-950/20'
                    : dragOver
                      ? 'border-primary bg-primary/10 scale-[1.01]'
                      : 'border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/50'
                }
              `}
            >
              {scanning ? (
                <div className="flex flex-col items-center justify-center py-8 gap-3">
                  <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center">
                    <IconLoader2 className="h-7 w-7 text-primary animate-spin" />
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-medium">KI analysiert...</p>
                    <p className="text-xs text-muted-foreground mt-0.5">Felder werden automatisch ausgefüllt</p>
                  </div>
                </div>
              ) : scanSuccess ? (
                <div className="flex flex-col items-center justify-center py-8 gap-3">
                  <div className="h-14 w-14 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                    <IconCircleCheck className="h-7 w-7 text-green-600 dark:text-green-400" />
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-medium text-green-700 dark:text-green-400">Felder ausgefüllt!</p>
                    <p className="text-xs text-muted-foreground mt-0.5">Prüfe die Werte und passe sie ggf. an</p>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-8 gap-3">
                  <div className="h-14 w-14 rounded-full bg-primary/8 flex items-center justify-center">
                    <IconPhotoPlus className="h-7 w-7 text-primary/70" />
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-medium">Foto oder Dokument hierher ziehen oder auswählen</p>
                  </div>
                </div>
              )}

              {preview && !scanning && (
                <div className="absolute top-2 right-2">
                  <div className="relative group">
                    <img src={preview} alt="" className="h-10 w-10 rounded-md object-cover border shadow-sm" />
                    <button
                      type="button"
                      onClick={e => { e.stopPropagation(); setPreview(null); }}
                      className="absolute -top-1.5 -right-1.5 h-4 w-4 rounded-full bg-muted-foreground/80 text-white flex items-center justify-center"
                    >
                      <IconX className="h-2.5 w-2.5" />
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="grid grid-cols-3 gap-2">
              <Button type="button" variant="outline" size="sm" className="h-10 text-xs" disabled={scanning}
                onClick={e => { e.stopPropagation(); cameraInputRef.current?.click(); }}>
                <IconCamera className="h-3.5 w-3.5 mr-1" />Kamera
              </Button>
              <Button type="button" variant="outline" size="sm" className="h-10 text-xs" disabled={scanning}
                onClick={e => { e.stopPropagation(); fileInputRef.current?.click(); }}>
                <IconUpload className="h-3.5 w-3.5 mr-1" />Foto wählen
              </Button>
              <Button type="button" variant="outline" size="sm" className="h-10 text-xs" disabled={scanning}
                onClick={e => {
                  e.stopPropagation();
                  if (fileInputRef.current) {
                    fileInputRef.current.accept = 'application/pdf,.pdf';
                    fileInputRef.current.click();
                    setTimeout(() => { if (fileInputRef.current) fileInputRef.current.accept = 'image/*,application/pdf'; }, 100);
                  }
                }}>
                <IconFileText className="h-3.5 w-3.5 mr-1" />Dokument
              </Button>
            </div>

            <div className="relative">
              <Textarea
                placeholder="Text eingeben oder einfügen, z.B. Notizen, E-Mails, Beschreibungen..."
                value={aiText}
                onChange={e => {
                  setAiText(e.target.value);
                  const el = e.target;
                  el.style.height = 'auto';
                  el.style.height = Math.min(Math.max(el.scrollHeight, 56), 96) + 'px';
                }}
                onKeyDown={e => {
                  if (e.key === 'Enter' && (e.ctrlKey || e.metaKey) && aiText.trim() && !scanning) {
                    e.preventDefault();
                    handleAiExtract();
                  }
                }}
                disabled={scanning}
                rows={2}
                className="pr-12 resize-none text-sm overflow-y-auto"
              />
              <button
                type="button"
                className="absolute right-2 top-2 h-8 w-8 inline-flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                disabled={scanning}
                onClick={async () => {
                  try {
                    const text = await navigator.clipboard.readText();
                    if (text) setAiText(prev => prev ? prev + '\n' + text : text);
                  } catch {}
                }}
                title="Paste"
              >
                <IconClipboard className="h-4 w-4" />
              </button>
            </div>
            {aiText.trim() && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="w-full h-9 text-xs"
                disabled={scanning}
                onClick={() => handleAiExtract()}
              >
                <IconSparkles className="h-3.5 w-3.5 mr-1.5" />Analysieren
              </Button>
            )}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
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
          <div className="space-y-2">
            <Label htmlFor="trainer">Trainer</Label>
            <Select
              value={extractRecordId(fields.trainer) ?? 'none'}
              onValueChange={v => setFields(f => ({ ...f, trainer: v === 'none' ? undefined : createRecordUrl(APP_IDS.TRAINER, v) }))}
            >
              <SelectTrigger id="trainer"><SelectValue placeholder="Auswählen..." /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">—</SelectItem>
                {trainerList.map(r => (
                  <SelectItem key={r.record_id} value={r.record_id}>
                    {r.fields.nachname ?? r.record_id}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Abbrechen</Button>
            <Button type="submit" disabled={saving}>
              {saving ? 'Speichern...' : defaultValues ? 'Speichern' : 'Erstellen'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}