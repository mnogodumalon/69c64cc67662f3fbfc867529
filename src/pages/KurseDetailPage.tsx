import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { LivingAppsService, extractRecordId } from '@/services/livingAppsService';
import type { Kurse, Trainer } from '@/types/app';
import { APP_IDS } from '@/types/app';
import { Button } from '@/components/ui/button';
import { IconArrowLeft, IconTrash } from '@tabler/icons-react';
import {
  RecordView, RecordHeader, RecordKeyFacts, RecordSection, RecordField,
  RecordAttachments, RecordViewSkeleton, RecordViewEmpty,
} from '@/components/widgets/RecordView';
import { KurseDialog } from '@/components/dialogs/KurseDialog';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { AI_PHOTO_SCAN, AI_PHOTO_LOCATION } from '@/config/ai-features';
import { formEnhancements } from '@/config/form-enhancements/Kurse';
import { evalComputed } from '@/config/form-enhancements/types';

export default function KurseDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [record, setRecord] = useState<Kurse | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [trainerList, setTrainerList] = useState<Trainer[]>([]);

  useEffect(() => { loadData(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [id]);

  async function loadData() {
    setLoading(true);
    try {
      const [mainData, trainerData] = await Promise.all([
        LivingAppsService.getKurse(),
        LivingAppsService.getTrainer(),
      ]);
      setTrainerList(trainerData);
      setRecord(mainData.find(r => r.record_id === id) ?? null);
    } finally {
      setLoading(false);
    }
  }

  async function handleUpdate(fields: Kurse['fields']) {
    if (!record) return;
    await LivingAppsService.updateKurseEntry(record.record_id, fields);
    await loadData();
    setEditing(false);
  }

  async function handleDelete() {
    if (!record) return;
    await LivingAppsService.deleteKurseEntry(record.record_id);
    setDeleteOpen(false);
    navigate('/kurse');
  }

  function getTrainerDisplayName(url?: unknown) {
    if (!url) return '—';
    const refId = extractRecordId(url);
    return trainerList.find(r => r.record_id === refId)?.fields.nachname ?? '—';
  }

  if (loading) {
    return <RecordViewSkeleton />;
  }

  if (!record) {
    return (
      <RecordViewEmpty
        title="Eintrag nicht gefunden"
        action={
          <Button variant="ghost" onClick={() => navigate('/kurse')}>
            <IconArrowLeft className="h-4 w-4 mr-1.5" />
            Zurück
          </Button>
        }
      />
    );
  }

  return (
    <RecordView
      onBack={() => navigate('/kurse')}
      onEdit={() => setEditing(true)}
      backLabel="Zurück"
      editLabel="Bearbeiten"
    >
      <RecordHeader title={record.fields.kursname ?? 'Kurse'} />

      {(() => {
        const lookupLists: Record<string, unknown> = {
          trainer: trainerList,
        };
        const fmtComputed = (k: string, n: number) =>
          /(?:kosten|preis|betrag|gesamt|netto|brutto|summe|mwst|rabatt|anzahlung|umsatz|saldo)/i.test(k)
            ? n.toLocaleString('de-DE', { style: 'currency', currency: 'EUR', minimumFractionDigits: 2, maximumFractionDigits: 2 })
            : n.toLocaleString('de-DE', { maximumFractionDigits: 2 });
        const computedFacts = Object.entries(formEnhancements.computed)
          .map(([key, formula]) => {
            const v = evalComputed(formula, record!.fields as Record<string, unknown>, { lookupLists });
            return v != null
              ? { label: key.charAt(0).toUpperCase() + key.slice(1).replace(/_/g, ' '), value: fmtComputed(key, v) }
              : null;
          })
          .filter((f): f is { label: string; value: string } => f !== null);
        return computedFacts.length > 0 ? <RecordKeyFacts items={computedFacts} /> : null;
      })()}

      <RecordSection title="Details" cols={2}>
        <RecordField label="Kursname" value={record.fields.kursname} format="text" />
        <RecordField label="Yoga-Stil" value={record.fields.yoga_stil} format="pill" />
        <RecordField label="Kursbeschreibung" value={record.fields.beschreibung} format="longtext" className="md:col-span-2" />
        <RecordField label="Niveau" value={record.fields.niveau} format="pill" />
        <RecordField label="Wochentag(e)" value={Array.isArray(record.fields.wochentag) ? record.fields.wochentag.map((v: unknown) => (v && typeof v === 'object' && 'label' in v) ? (v as {label: unknown}).label : v).join(', ') : null} format="text" />
        <RecordField label="Uhrzeit" value={record.fields.uhrzeit} format="text" />
        <RecordField label="Dauer (Minuten)" value={record.fields.dauer_minuten} format="text" />
        <RecordField label="Startdatum" value={record.fields.startdatum} format="date" />
        <RecordField label="Enddatum" value={record.fields.enddatum} format="date" />
        <RecordField label="Raum / Ort" value={record.fields.raum} format="text" />
        <RecordField label="Maximale Teilnehmerzahl" value={record.fields.max_teilnehmer} format="text" />
        <RecordField label="Kursgebühr (€)" value={record.fields.kursgebuehr} format="text" />
        <RecordField label="Trainer" value={getTrainerDisplayName(record.fields.trainer)} format="text" />
      </RecordSection>

      <RecordAttachments appId={APP_IDS.KURSE} recordId={record.record_id} />

      <div className="flex justify-end pt-2">
        <Button variant="ghost" onClick={() => setDeleteOpen(true)} className="text-destructive hover:text-destructive">
          <IconTrash className="h-4 w-4 mr-1.5" />
          Löschen
        </Button>
      </div>

      <KurseDialog
        open={editing}
        onClose={() => setEditing(false)}
        onSubmit={handleUpdate}
        defaultValues={record.fields}
        recordId={record.record_id}
        trainerList={trainerList}
        enablePhotoScan={AI_PHOTO_SCAN['Kurse']}
        enablePhotoLocation={AI_PHOTO_LOCATION['Kurse']}
      />

      <ConfirmDialog
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        onConfirm={handleDelete}
        title="Kurse löschen"
        description="Soll dieser Eintrag wirklich gelöscht werden? Diese Aktion kann nicht rückgängig gemacht werden."
      />
    </RecordView>
  );
}
