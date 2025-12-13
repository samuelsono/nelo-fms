import './App.css'
import LoginPage from './pages/login-page';
import { BrowserRouter, Navigate, Outlet, Route, Routes } from 'react-router-dom';
import { useUserStore } from './store/userStore';
import Navbar from './components/nav-bar';
import DashboardPage from './pages/dashboard';
import PageNotFound from './pages/page-not-found';
import VehicleList from './pages/vehicle-list';
import { AuthProvider } from './components/AuthProvider';
import ManageVehicle from './pages/manage-vehicle';
import TrackingUnitList from './pages/tracking-unit-list';
import TenantList from './pages/tenant-list';
import DriverList from './pages/driver-list';
import LiveVehicleData from './pages/live-vehicle-data';
import ManageTrackingUnit from './pages/manage-tracking-unit';
import SimCardList from './pages/sim-list';
import TrackingPage from './pages/tracking-page';

function App() {

  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="" element={<PublicRoute />} >
               <Route index element={<LoginPage />} />
               <Route path='login' element={<LoginPage />} />
          </Route>
          <Route path="" element={<PrivateRoute />} >
                <Route path='dashboard' element={<DashboardPage />} />
                <Route path='vehicles' element={<VehicleList />} />
                <Route path='units' element={<TrackingUnitList />} />
                <Route path='tenants' element={<TenantList />} />
                <Route path='drivers' element={<DriverList />} />
                <Route path='live-data' element={<LiveVehicleData />} />
                <Route path='vehicles/:vehicleId' element={<ManageVehicle />} />
                <Route path='tracking-units/:unitId' element={<ManageTrackingUnit />} />
                <Route path="tracking" element={<TrackingPage />} />

                <Route path='sims' element={<SimCardList />} />
                
                <Route path='*' element={<PageNotFound />} />
          </Route>
          <Route path='*' element={<PageNotFound />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}

export default App


// Public Route Guard - redirects authenticated users to dashboard
const PublicRoute = () => {
  const { user } = useUserStore();
  
  if (user) {
    return <Navigate to="/dashboard" replace />;
  }
  
  return <PublicLayout />;
}

// Private Route Guard - redirects unauthenticated users to login
const PrivateRoute = () => {
  const { user } = useUserStore();
  
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  
  return <PrivateLayout />;
}

const PublicLayout = () => {
  return (
    <div className='flex items-center justify-center h-screen'>
      <Outlet />
    </div>
  )
}

const PrivateLayout = () => {
  return (
    <div className='flex flex-col bg-gray-100 min-h-screen'>
      <Navbar />
      <Outlet />
     <div className="text-center mt-5">
        <p className="text-sm">Copyright © {new Date().getFullYear()} Nelotec</p>
      </div>
    </div>
  )
}

 