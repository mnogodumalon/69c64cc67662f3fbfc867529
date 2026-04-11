import { HashRouter, Routes, Route } from 'react-router-dom';
import { ActionsProvider } from '@/context/ActionsContext';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { Layout } from '@/components/Layout';
import DashboardOverview from '@/pages/DashboardOverview';
import AdminPage from '@/pages/AdminPage';
import MitgliederPage from '@/pages/MitgliederPage';
import BuchungenPage from '@/pages/BuchungenPage';
import TrainerPage from '@/pages/TrainerPage';
import KursePage from '@/pages/KursePage';

export default function App() {
  return (
    <ErrorBoundary>
      <HashRouter>
        <ActionsProvider>
          <Routes>
            <Route element={<Layout />}>
              <Route index element={<DashboardOverview />} />
              <Route path="mitglieder" element={<MitgliederPage />} />
              <Route path="buchungen" element={<BuchungenPage />} />
              <Route path="trainer" element={<TrainerPage />} />
              <Route path="kurse" element={<KursePage />} />
              <Route path="admin" element={<AdminPage />} />
            </Route>
          </Routes>
        </ActionsProvider>
      </HashRouter>
    </ErrorBoundary>
  );
}
