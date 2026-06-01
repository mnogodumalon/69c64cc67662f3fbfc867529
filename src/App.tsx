import '@/lib/sentry';
import { lazy, Suspense } from 'react';
import { HashRouter, Routes, Route } from 'react-router-dom';
import { ActionsProvider } from '@/context/ActionsContext';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { ErrorBusProvider } from '@/components/ErrorBus';
import { Layout } from '@/components/Layout';
import DashboardOverview from '@/pages/DashboardOverview';
import { WorkflowPlaceholders } from '@/components/WorkflowPlaceholders';
import AdminPage from '@/pages/AdminPage';
import KursePage from '@/pages/KursePage';
import KurseDetailPage from '@/pages/KurseDetailPage';
import MitgliederPage from '@/pages/MitgliederPage';
import MitgliederDetailPage from '@/pages/MitgliederDetailPage';
import BuchungenPage from '@/pages/BuchungenPage';
import BuchungenDetailPage from '@/pages/BuchungenDetailPage';
import TrainerPage from '@/pages/TrainerPage';
import TrainerDetailPage from '@/pages/TrainerDetailPage';
import PublicFormKurse from '@/pages/public/PublicForm_Kurse';
import PublicFormMitglieder from '@/pages/public/PublicForm_Mitglieder';
import PublicFormBuchungen from '@/pages/public/PublicForm_Buchungen';
import PublicFormTrainer from '@/pages/public/PublicForm_Trainer';
// <public:imports>
// </public:imports>
// <custom:imports>
// </custom:imports>

export default function App() {
  return (
    <ErrorBoundary>
      <ErrorBusProvider>
        <HashRouter>
          <ActionsProvider>
            <Routes>
              <Route path="public/69c64ca968df8b8b7588964b" element={<PublicFormKurse />} />
              <Route path="public/69c64ca94239a6f64d141247" element={<PublicFormMitglieder />} />
              <Route path="public/69c64caa332ffb5d818518fb" element={<PublicFormBuchungen />} />
              <Route path="public/69c64ca4e8626bc986a4e869" element={<PublicFormTrainer />} />
              {/* <public:routes> */}
              {/* </public:routes> */}
              <Route element={<Layout />}>
                <Route index element={<><div className="mb-8"><WorkflowPlaceholders /></div><DashboardOverview /></>} />
                <Route path="kurse" element={<KursePage />} />
                <Route path="kurse/:id" element={<KurseDetailPage />} />
                <Route path="mitglieder" element={<MitgliederPage />} />
                <Route path="mitglieder/:id" element={<MitgliederDetailPage />} />
                <Route path="buchungen" element={<BuchungenPage />} />
                <Route path="buchungen/:id" element={<BuchungenDetailPage />} />
                <Route path="trainer" element={<TrainerPage />} />
                <Route path="trainer/:id" element={<TrainerDetailPage />} />
                <Route path="admin" element={<AdminPage />} />
                {/* <custom:routes> */}
                {/* </custom:routes> */}
              </Route>
            </Routes>
          </ActionsProvider>
        </HashRouter>
      </ErrorBusProvider>
    </ErrorBoundary>
  );
}
