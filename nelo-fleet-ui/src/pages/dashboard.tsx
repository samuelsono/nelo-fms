import { Card } from "primereact/card";
import { useState, useEffect } from "react";
import { useUserStore } from "../store/userStore";
import { vehicleApi } from "../apis/vehicle-api";
import { trackingUnitApi } from "../apis/tracking-unit-api";
import { simCardApi } from "../apis/sim-card-api";
import TelemetryChart from "../components/telemetry-chart";

interface DashboardMetrics {
  vehicles: {
    total: number;
    active: number;
    inactive: number;
    maintenance: number;
  };
  units: {
    total: number;
    active: number;
    inactive: number;
  };
  sims: {
    total: number;
    active: number;
    inactive: number;
  };
}

const DashboardPage = () => {
  const { user } = useUserStore();
  const [metrics, setMetrics] = useState<DashboardMetrics>({
    vehicles: { total: 0, active: 0, inactive: 0, maintenance: 0 },
    units: { total: 0, active: 0, inactive: 0 },
    sims: { total: 0, active: 0, inactive: 0 }
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        setLoading(true);
        
        // Fetch all data in parallel
        const [vehicles, units, sims] = await Promise.all([
          vehicleApi.getVehicles(),
          trackingUnitApi.getTrackingUnits(),
          simCardApi.getSimCards()
        ]);

        // Calculate vehicle metrics
        const vehicleMetrics = {
          total: vehicles.length,
          active: vehicles.filter(v => v.status === 'active').length,
          inactive: vehicles.filter(v => v.status === 'inactive').length,
          maintenance: vehicles.filter(v => v.status === 'maintenance').length
        };

        // Calculate unit metrics
        const unitMetrics = {
          total: units.length,
          active: units.filter(u => u.isActive).length,
          inactive: units.filter(u => !u.isActive).length
        };

        // Calculate SIM metrics
        const simMetrics = {
          total: sims.length,
          active: sims.filter(s => s.isActive).length,
          inactive: sims.filter(s => !s.isActive).length
        };

        setMetrics({
          vehicles: vehicleMetrics,
          units: unitMetrics,
          sims: simMetrics
        });
      } catch (error) {
        console.error('Failed to fetch dashboard metrics:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchMetrics();
  }, []);

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-xl font-bold mb-4">Dashboard</h1>
      <p>Welcome {user?.name}!</p>

      <div className="grid grid-cols-3 mt-5 gap-5">
        <Card 
          title={`Vehicles (${metrics.vehicles.total})`}
          className="p-2" 
          footer={
            <VehiclesFooter 
              labels={[
                { label: "Active", value: metrics.vehicles.active, color: "text-green-600" },
                { label: "Inactive", value: metrics.vehicles.inactive, color: "text-red-600" },
                { label: "Maintenance", value: metrics.vehicles.maintenance, color: "text-yellow-600" }
              ]} 
            />
          } 
        />
        <Card 
          title={`Units (${metrics.units.total})`}
          className="p-2" 
          footer={
            <VehiclesFooter 
              labels={[
                { label: "Active", value: metrics.units.active, color: "text-green-600" },
                { label: "Inactive", value: metrics.units.inactive, color: "text-red-600" }
              ]} 
            />
          } 
        />
        <Card 
          title={`Sims (${metrics.sims.total})`}
          className="p-2" 
          footer={
            <VehiclesFooter 
              labels={[
                { label: "Active", value: metrics.sims.active, color: "text-green-600" },
                { label: "Inactive", value: metrics.sims.inactive, color: "text-red-600" }
              ]} 
            />
          } 
        />
      </div>
           
    </div>
  );
};

export default DashboardPage;


const VehiclesFooter = ({ labels}: { labels: { label: string; color?: string; value: number }[] }) => {
  return (
    <div className="flex justify-between items-center">
    { labels.map(label => <div className="flex flex-col">
        <span className={"font-bold " + label.color}>{label.label}</span>
      <span className={"font-bold "}>{label.value}</span>
      </div>)}
    </div>
  );
}