import { useState, useEffect, useMemo, useCallback } from 'react';
import type { Mitglieder, Buchungen, Trainer, Kurse } from '@/types/app';
import { LivingAppsService } from '@/services/livingAppsService';

export function useDashboardData() {
  const [mitglieder, setMitglieder] = useState<Mitglieder[]>([]);
  const [buchungen, setBuchungen] = useState<Buchungen[]>([]);
  const [trainer, setTrainer] = useState<Trainer[]>([]);
  const [kurse, setKurse] = useState<Kurse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchAll = useCallback(async () => {
    setError(null);
    try {
      const [mitgliederData, buchungenData, trainerData, kurseData] = await Promise.all([
        LivingAppsService.getMitglieder(),
        LivingAppsService.getBuchungen(),
        LivingAppsService.getTrainer(),
        LivingAppsService.getKurse(),
      ]);
      setMitglieder(mitgliederData);
      setBuchungen(buchungenData);
      setTrainer(trainerData);
      setKurse(kurseData);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Fehler beim Laden der Daten'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // Silent background refresh (no loading state change → no flicker)
  useEffect(() => {
    async function silentRefresh() {
      try {
        const [mitgliederData, buchungenData, trainerData, kurseData] = await Promise.all([
          LivingAppsService.getMitglieder(),
          LivingAppsService.getBuchungen(),
          LivingAppsService.getTrainer(),
          LivingAppsService.getKurse(),
        ]);
        setMitglieder(mitgliederData);
        setBuchungen(buchungenData);
        setTrainer(trainerData);
        setKurse(kurseData);
      } catch {
        // silently ignore — stale data is better than no data
      }
    }
    function handleRefresh() { void silentRefresh(); }
    window.addEventListener('dashboard-refresh', handleRefresh);
    return () => window.removeEventListener('dashboard-refresh', handleRefresh);
  }, []);

  const mitgliederMap = useMemo(() => {
    const m = new Map<string, Mitglieder>();
    mitglieder.forEach(r => m.set(r.record_id, r));
    return m;
  }, [mitglieder]);

  const trainerMap = useMemo(() => {
    const m = new Map<string, Trainer>();
    trainer.forEach(r => m.set(r.record_id, r));
    return m;
  }, [trainer]);

  const kurseMap = useMemo(() => {
    const m = new Map<string, Kurse>();
    kurse.forEach(r => m.set(r.record_id, r));
    return m;
  }, [kurse]);

  return { mitglieder, setMitglieder, buchungen, setBuchungen, trainer, setTrainer, kurse, setKurse, loading, error, fetchAll, mitgliederMap, trainerMap, kurseMap };
}