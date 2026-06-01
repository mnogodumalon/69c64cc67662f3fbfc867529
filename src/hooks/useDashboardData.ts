import { useState, useEffect, useMemo, useCallback } from 'react';
import type { Kurse, Mitglieder, Buchungen, Trainer } from '@/types/app';
import { LivingAppsService } from '@/services/livingAppsService';

export function useDashboardData() {
  const [kurse, setKurse] = useState<Kurse[]>([]);
  const [mitglieder, setMitglieder] = useState<Mitglieder[]>([]);
  const [buchungen, setBuchungen] = useState<Buchungen[]>([]);
  const [trainer, setTrainer] = useState<Trainer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchAll = useCallback(async () => {
    setError(null);
    try {
      const [kurseData, mitgliederData, buchungenData, trainerData] = await Promise.all([
        LivingAppsService.getKurse(),
        LivingAppsService.getMitglieder(),
        LivingAppsService.getBuchungen(),
        LivingAppsService.getTrainer(),
      ]);
      setKurse(kurseData);
      setMitglieder(mitgliederData);
      setBuchungen(buchungenData);
      setTrainer(trainerData);
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
        const [kurseData, mitgliederData, buchungenData, trainerData] = await Promise.all([
          LivingAppsService.getKurse(),
          LivingAppsService.getMitglieder(),
          LivingAppsService.getBuchungen(),
          LivingAppsService.getTrainer(),
        ]);
        setKurse(kurseData);
        setMitglieder(mitgliederData);
        setBuchungen(buchungenData);
        setTrainer(trainerData);
      } catch {
        // silently ignore — stale data is better than no data
      }
    }
    function handleRefresh() { void silentRefresh(); }
    window.addEventListener('dashboard-refresh', handleRefresh);
    return () => window.removeEventListener('dashboard-refresh', handleRefresh);
  }, []);

  const kurseMap = useMemo(() => {
    const m = new Map<string, Kurse>();
    kurse.forEach(r => m.set(r.record_id, r));
    return m;
  }, [kurse]);

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

  return { kurse, setKurse, mitglieder, setMitglieder, buchungen, setBuchungen, trainer, setTrainer, loading, error, fetchAll, kurseMap, mitgliederMap, trainerMap };
}