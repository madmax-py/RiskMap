import { HashRouter, Navigate, Route, Routes } from 'react-router-dom'
import { MotionConfig } from 'framer-motion'
import { AppProvider } from './store/AppStore'
import { ToastProvider } from './components/Toast'
import { AppLayout, PublicLayout } from './components/AppLayout'
import Login from './pages/Login'
import Signup from './pages/Signup'
import ForgotPassword from './pages/ForgotPassword'
import MapHome from './pages/MapHome'
import RegionDetails from './pages/RegionDetails'
import RouteAnalysis from './pages/RouteAnalysis'
import Navigation from './pages/Navigation'
import RoutesHistory from './pages/RoutesHistory'
import Alerts from './pages/Alerts'
import Profile from './pages/Profile'
import Settings from './pages/Settings'
import ReportOccurrence from './pages/ReportOccurrence'
import ReportSuccess from './pages/ReportSuccess'

/**
 * HashRouter (URLs com #) pra funcionar em qualquer hospedagem estática sem configurar servidor.
 * Se for pra Vercel/Netlify, pode trocar por BrowserRouter tranquilo.
 */
export default function App() {
  return (
    <MotionConfig reducedMotion="user">
      <AppProvider>
        <ToastProvider>
          <HashRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
            <Routes>
              <Route element={<PublicLayout />}>
                <Route path="/login" element={<Login />} />
                <Route path="/cadastro" element={<Signup />} />
                <Route path="/recuperar-senha" element={<ForgotPassword />} />
              </Route>
              <Route element={<AppLayout />}>
                <Route path="/mapa" element={<MapHome />} />
                <Route path="/regiao/:id" element={<RegionDetails />} />
                <Route path="/rota" element={<RouteAnalysis />} />
                <Route path="/navegacao" element={<Navigation />} />
                <Route path="/rotas" element={<RoutesHistory />} />
                <Route path="/alertas" element={<Alerts />} />
                <Route path="/perfil" element={<Profile />} />
                <Route path="/perfil/:section" element={<Settings />} />
                <Route path="/ocorrencia/nova" element={<ReportOccurrence />} />
                <Route path="/ocorrencia/:id/enviada" element={<ReportSuccess />} />
              </Route>
              <Route path="*" element={<Navigate to="/mapa" replace />} />
            </Routes>
          </HashRouter>
        </ToastProvider>
      </AppProvider>
    </MotionConfig>
  )
}
