import { Routes, Route } from 'react-router-dom'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import { Layout } from '@/components/Layout'
import { Dashboard } from '@/pages/Dashboard'
import { DeviceList } from '@/pages/DeviceList'
import { TaskList } from '@/pages/TaskList'
import { ResourceCalc } from '@/pages/ResourceCalc'
import { BenchmarkList } from '@/pages/BenchmarkList'
import EvalManage from '@/pages/EvalManage'
import EvalResults from '@/pages/EvalResults'
import { SystemSettings } from '@/pages/SystemSettings'

function App() {
  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route
          index
          element={
            <ErrorBoundary>
              <Dashboard />
            </ErrorBoundary>
          }
        />
        <Route
          path="devices"
          element={
            <ErrorBoundary>
              <DeviceList />
            </ErrorBoundary>
          }
        />
        <Route
          path="tests"
          element={
            <ErrorBoundary>
              <TaskList />
            </ErrorBoundary>
          }
        />
        <Route
          path="resource-calc"
          element={
            <ErrorBoundary>
              <ResourceCalc />
            </ErrorBoundary>
          }
        />
        <Route
          path="results"
          element={
            <ErrorBoundary>
              <BenchmarkList />
            </ErrorBoundary>
          }
        />
        <Route
          path="eval-manage"
          element={
            <ErrorBoundary>
              <EvalManage />
            </ErrorBoundary>
          }
        />
        <Route
          path="eval-results"
          element={
            <ErrorBoundary>
              <EvalResults />
            </ErrorBoundary>
          }
        />
        <Route
          path="settings"
          element={
            <ErrorBoundary>
              <SystemSettings />
            </ErrorBoundary>
          }
        />
      </Route>
    </Routes>
  )
}

export default App
