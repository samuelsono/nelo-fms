import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Toast } from "primereact/toast";
import { ProgressSpinner } from "primereact/progressspinner";
import EventsList from "../components/event-list";
import VehicleMap from "../components/vehicle-map";
import TelemetryChart from "../components/telemetry-chart";
import { useVehicleData } from "../hooks/useVehicleData";
import { vehicleApi, type Vehicle } from "../apis/vehicle-api";
import { ProgressBar } from "primereact/progressbar";

export default function ManageVehicle() {
    const { vehicleId } = useParams<{ vehicleId: string }>();
    const navigate = useNavigate();

    const [vehicle, setVehicle] = useState<Vehicle | null>(null);
    const [loading, setLoading] = useState(true);
    const toast = React.useRef<Toast>(null);

    const {
        isConnected,
        latestData,
        isFetchingCache,
        connect,
        joinDeviceGroup,
        leaveDeviceGroup
    } = useVehicleData({
        maxDataPoints: 50,
        imei: vehicle?.trackingUnit?.imeiNumber,
        pollInterval: 10000
    });

    // Fetch vehicle data
    useEffect(() => {
        const fetchVehicle = async () => {
            if (!vehicleId) {
                navigate('/vehicles');
                return;
            }

            try {
                setLoading(true);
                const vehicleData = await vehicleApi.getVehicle(vehicleId);
                console.log("Fetched vehicle data:", vehicleData);
                setVehicle(vehicleData);
            } catch (error: any) {
                toast.current?.show({
                    severity: 'error',
                    summary: 'Error',
                    detail: error.response?.data?.message || 'Failed to fetch vehicle'
                });
                setTimeout(() => navigate('/vehicles'), 2000);
            } finally {
                setLoading(false);
            }
        };

        fetchVehicle();
    }, [vehicleId, navigate]);

    // Auto-connect and join device group when vehicle is loaded
    useEffect(() => {
        const autoConnectAndJoin = async () => {
            if (!vehicle?.trackingUnit?.imeiNumber) return;

            try {
                if (!isConnected) {
                    await connect();
                }

                await new Promise(resolve => setTimeout(resolve, 1000));

                const imei = vehicle.trackingUnit.imeiNumber;
                await joinDeviceGroup(imei);

                toast.current?.show({
                    severity: 'success',
                    summary: 'Monitoring Active',
                    detail: `Now monitoring vehicle: ${vehicle.name} (${imei})`
                });
            } catch (error: any) {
                console.error('Auto-connect failed:', error);
            }
        };

        if (vehicle && !loading) {
            autoConnectAndJoin();
        }

        return () => {
            if (vehicle?.trackingUnit?.imeiNumber) {
                leaveDeviceGroup(vehicle.trackingUnit.imeiNumber).catch(console.error);
            }
        };
    }, [vehicle, loading]);

    const getBatteryVoltageColor = (voltage: number | undefined) => {
        if (voltage === undefined) return "bg-gray-500";
        if (voltage >= 12.0) return "bg-green-600";
        if (voltage >= 11.5) return "bg-yellow-500";
        if (voltage >= 10.5) return "bg-yellow-300";
        return "bg-red-500";
    };

    const getEngineStateColor = (voltage: number | undefined) => {
        if (voltage === undefined) return "bg-gray-500";
        if (voltage >= 13.5) return "bg-green-600";
        return "bg-red-500";
    };

    const getEngineState = (voltage: number | undefined, ignition: boolean | undefined) => {
        if (voltage === undefined) return "OFF";
        if (voltage >= 13.5 && ignition) return "ON";
        return "OFF";
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-screen">
                <ProgressSpinner />
            </div>
        );
    }

    if (!vehicle) {
        return (
            <div className="flex items-center justify-center h-screen">
                <p>Vehicle not found</p>
            </div>
        );
    }

    const coords = latestData && latestData.latitude && latestData.longitude
        ? [latestData.latitude, latestData.longitude]
        : null;

    return (
        <div className="container mx-auto p-6">
            <Toast ref={toast} />
            {isFetchingCache ?  
                <ProgressBar mode="indeterminate" style={{ height: '2px' }} className="mt-2" />
            : <div className="min-h-[10px] w-full"></div>}
            <div className="flex justify-start gap-5">
            <div className="grid grid-cols-5 gap-3 w-full md:w-1/2">
                <div className="relative col-span-2">
                    
                   <img src="/src/assets/car.jpg" alt="Nelotec Logo" className="mx-auto z-30" />
                   <div className="flex justify-between bg-white p-3 z-50 -mt-8">
                        <p>{vehicle.name}</p>
                        <p>{vehicle.plateNumber}</p>
                   </div>
                </div>
                {/* Live metrics */}
                <MetricCard 
                    title="Speed" 
                    value={latestData?.speed !== undefined ? `${latestData.speed.toFixed(1)} km/h` : '- -'} 
                />
                <MetricCard 
                    title="Distance" 
                    value={latestData?.distance !== undefined ? `${latestData.distance.toFixed(1)} km` : '- -'} 
                />
                <MetricCard 
                    title="RPM" 
                    value={latestData?.rpm !== undefined ? `${latestData.rpm.toFixed(1)} rpm` : '- -'} 
                />
                <MetricCard 
                    title="Ignition" 
                    value={getEngineState(latestData?.batteryVoltage, latestData?.ignition)} 
                    color={getEngineStateColor(latestData?.batteryVoltage)} 
                />
                <MetricCard 
                    title="Battery" 
                    value={latestData?.batteryVoltage !== undefined ? `${latestData.batteryVoltage.toFixed(2)} V` : '- -'} 
                    color={getBatteryVoltageColor(latestData?.batteryVoltage)} 
                />

            </div>
             <div className="w-full md:w-1/2">
                   <VehicleMap 
                       longitude={coords ? coords[1] : 0} 
                       latitude={coords ? coords[0] : 0} 
                   />
                   {vehicle.trackingUnit?.imeiNumber && (
                       <div className="mt-2 p-3 bg-gray-100 rounded border border-gray-300">
                           <div className="flex items-center justify-between">
                               <span className="text-sm font-semibold text-gray-600">Connected Unit:</span>
                               <span className="text-sm font-mono text-gray-800">{vehicle.trackingUnit.imeiNumber}</span>
                           </div>
                       </div>
                   )}
            </div>
            
            </div>
            
            
            
            {vehicle.trackingUnit?.imeiNumber && (
                <div className="grid grid-cols-1 md:grid-cols-2 mt-5 gap-5">
                    <div className="col-span-1  rounded border border-gray-300 h-55 pt-3 px-3 bg-white">
                          <p>Altitude (m)</p>
                           <TelemetryChart deviceId={vehicle.trackingUnit.imeiNumber} field="alt" unit="m" timespan="6h" />
                    </div>
                    <div className="col-span-1  rounded border border-gray-300 h-55 pt-3 px-3  bg-white">
                          <p>Speed (km/h)</p>
                           <TelemetryChart deviceId={vehicle.trackingUnit.imeiNumber} field="sp" unit="km/h" timespan="6h" />
                    </div>
                    <div className="col-span-1  rounded border border-gray-300 h-55 pt-3 px-3  bg-white">
                          <p>Satellite Count</p>
                           <TelemetryChart deviceId={vehicle.trackingUnit.imeiNumber} field="sat" unit="" timespan="6h" />
                    </div>
                    <div className="col-span-1  rounded border border-gray-300 h-55 pt-3 px-3 bg-white">
                          <p>Battery Voltage (V)</p>
                           <TelemetryChart scaleFactor={1000} deviceId={vehicle.trackingUnit.imeiNumber} field="66" unit="V" timespan="6h" />
                    </div>
                    <div className="col-span-1  rounded border border-gray-300 h-55 pt-3 px-3 bg-white">
                            <p>Ignition State</p>
                            <TelemetryChart 
                                deviceId={vehicle.trackingUnit.imeiNumber} 
                                field="239" 
                                timespan="16h"
                                title="Ignition Status" 
                                color="#f44336"
                                chartType="area" 
                            />
                    </div>
                    <div className="col-span-1 rounded border border-gray-300 h-55 pt-3 px-3  bg-white">
                          <p>Unit Battery (V)</p>
                           <TelemetryChart scaleFactor={1000} deviceId={vehicle.trackingUnit.imeiNumber} field="67" unit="V" timespan="6h" />
                    </div>
                </div>
            )}

            <EventsList />
        </div>
    );
}

const MetricCard = ({ title, value, color }: { title: string; value: string; color?: string }) => {
    return (
        <div className="shadow-sm bg-white rounded overflow-hidden flex flex-col min-h-38">
            <h2 className="px-3 py-2">{title}</h2>
            <div className={`flex items-center justify-center flex-1 h-full ${color ?? "bg-gray-500"} text-white`}>
               <p className="text-2xl p-3">{value}</p>
            </div>
        </div>
    );
}