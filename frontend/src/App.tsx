import { Suspense, lazy } from "react";
import { Navigate, Route, Routes } from "react-router-dom";

import { AppShell } from "@/components/layout/app-shell";
import { LoadingScreen } from "@/components/common/loading-screen";

const DashboardPage = lazy(() => import("@/pages/dashboard-page").then((module) => ({ default: module.DashboardPage })));
const ControlEditorPage = lazy(() => import("@/pages/control-editor-page").then((module) => ({ default: module.ControlEditorPage })));
const ControlsListPage = lazy(() => import("@/pages/controls-list-page").then((module) => ({ default: module.ControlsListPage })));
const LoginPage = lazy(() => import("@/pages/login-page").then((module) => ({ default: module.LoginPage })));
const LogsPage = lazy(() => import("@/pages/logs-page").then((module) => ({ default: module.LogsPage })));
const RuleBuilderPage = lazy(() => import("@/pages/rule-builder-page").then((module) => ({ default: module.RuleBuilderPage })));

function App() {
  return (
    <Suspense fallback={<LoadingScreen />}>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route element={<AppShell />}>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/controls" element={<ControlsListPage />} />
          <Route path="/controls/new" element={<ControlEditorPage />} />
          <Route path="/controls/:id/edit" element={<ControlEditorPage />} />
          <Route path="/builder" element={<RuleBuilderPage />} />
          <Route path="/controls/:id/builder" element={<RuleBuilderPage />} />
          <Route path="/logs" element={<LogsPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
}

export default App;
