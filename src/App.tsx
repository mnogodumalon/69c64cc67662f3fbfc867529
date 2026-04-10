import { HashRouter, Routes, Route } from 'react-router-dom';
import { ActionsProvider } from '@/context/ActionsContext';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { Layout } from '@/components/Layout';
import DashboardOverview from '@/pages/DashboardOverview';
import { WorkflowPlaceholders } from '@/components/WorkflowPlaceholders';
import AdminPage from '@/pages/AdminPage';
import MitgliederPage from '@/pages/MitgliederPage';
import BuchungenPage from '@/pages/BuchungenPage';
import TrainerPage from '@/pages/TrainerPage';
import KursePage from '@/pages/KursePage';
import PublicFormMitglieder from '@/pages/public/PublicForm_Mitglieder';
import PublicFormBuchungen from '@/pages/public/PublicForm_Buchungen';
import PublicFormTrainer from '@/pages/public/PublicForm_Trainer';
import PublicFormKurse from '@/pages/public/PublicForm_Kurse';

export default function App() {
  return (
    <ErrorBoundary>
      <HashRouter>
        <ActionsProvider>
          <Routes>
            <Route path="public/69c64ca94239a6f64d141247" element={<PublicFormMitglieder />} />
            <Route path="public/69c64caa332ffb5d818518fb" element={<PublicFormBuchungen />} />
            <Route path="public/69c64ca4e8626bc986a4e869" element={<PublicFormTrainer />} />
            <Route path="public/69c64ca968df8b8b7588964b" element={<PublicFormKurse />} />
            <Route element={<Layout />}>
              <Route index element={<><div className="mb-8"><WorkflowPlaceholders /></div><DashboardOverview /></>} />
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
