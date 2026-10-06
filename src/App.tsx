import { useEffect } from 'react';
import { HashRouter, Navigate, Route, Routes, useParams } from 'react-router-dom';
import { useStore } from './store/useStore';
import { roleById } from './data/people';
import { Shell } from './components/layout/Shell';
import { SignIn } from './components/layout/SignIn';
import CommandCentre from './pages/CommandCentre';
import RoleHome from './pages/RoleHome';
import Tenders from './pages/Tenders';
import Design from './pages/Design';
import Prefab from './pages/Prefab';
import Projects from './pages/Projects';
import JobDetail from './pages/JobDetail';
import Crews from './pages/Crews';
import Handover from './pages/Handover';
import Maintenance from './pages/Maintenance';
import Finance from './pages/Finance';
import Hsqe from './pages/Hsqe';
import Agents from './pages/Agents';
import Integrations from './pages/Integrations';
import Efficiency from './pages/Efficiency';
import Field from './pages/Field';
import Guide from './pages/Guide';
import type { RoleId } from './data/types';

function HomeRedirect() {
  const role = useStore((s) => s.role);
  return <Navigate to={roleById(role).home} replace />;
}

function RoleHomeRoute() {
  const { role } = useParams();
  const setRole = useStore((s) => s.setRole);
  const current = useStore((s) => s.role);
  useEffect(() => {
    if (role && role !== current && ['eugene', 'robert', 'stephen', 'aaron', 'valerie', 'julia'].includes(role)) setRole(role as RoleId);
    // Only when the URL changes: re-running on store changes would undo a role switch mid-navigation.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [role]);
  if (role === 'donnacha') return <Navigate to="/command" replace />;
  return <RoleHome />;
}

export default function App() {
  const signedIn = useStore((s) => s.signedIn);
  const theme = useStore((s) => s.theme);
  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
  }, [theme]);
  if (!signedIn) return <SignIn />;
  return (
    <HashRouter>
      <Shell>
        <Routes>
          <Route path="/" element={<HomeRedirect />} />
          <Route path="/command" element={<CommandCentre />} />
          <Route path="/home" element={<HomeRedirect />} />
          <Route path="/home/:role" element={<RoleHomeRoute />} />
          <Route path="/tenders" element={<Tenders />} />
          <Route path="/design" element={<Design />} />
          <Route path="/prefab" element={<Prefab />} />
          <Route path="/projects" element={<Projects />} />
          <Route path="/projects/:id" element={<JobDetail />} />
          <Route path="/crews" element={<Crews />} />
          <Route path="/handover" element={<Handover />} />
          <Route path="/maintenance" element={<Maintenance />} />
          <Route path="/finance" element={<Finance />} />
          <Route path="/hsqe" element={<Hsqe />} />
          <Route path="/agents" element={<Agents />} />
          <Route path="/integrations" element={<Integrations />} />
          <Route path="/efficiency" element={<Efficiency />} />
          <Route path="/field" element={<Field />} />
          <Route path="/guide" element={<Guide />} />
          <Route path="*" element={<HomeRedirect />} />
        </Routes>
      </Shell>
    </HashRouter>
  );
}
