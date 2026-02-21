import type { FC } from 'react';
import { Routes, Route } from 'react-router-dom';
import { Layout } from './components/Layout';
import { DashboardView } from './views/DashboardView';

export const App: FC = () => (
  <Layout>
    <Routes>
      <Route path="/" element={<DashboardView />} />
    </Routes>
  </Layout>
);
