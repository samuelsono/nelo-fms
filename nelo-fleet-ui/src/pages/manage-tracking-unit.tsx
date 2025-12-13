import React, { useState, useEffect, use, useMemo } from 'react'
import { Card } from 'primereact/card'
import { Button } from 'primereact/button'
import { Badge } from 'primereact/badge'
import { DataTable } from 'primereact/datatable'
import { Column } from 'primereact/column'
import { InputText } from 'primereact/inputtext'
import { Toast } from 'primereact/toast'
import { useVehicleData } from '../hooks/useVehicleData'
import { type VehicleDataMessage } from '../services/vehicleDataService'
import { useParams, useNavigate } from 'react-router-dom'
import { trackingUnitApi, type TrackingUnit } from '../apis/tracking-unit-api'
import { vehicleDataApi } from '../apis/vehicle-data-api'
import { ProgressSpinner } from 'primereact/progressspinner'
import { MapContainer } from 'react-leaflet'
import VehicleMap from '../components/vehicle-map'
import VehicleEventsTable from '../components/vehicle-events-table'

export default function ManageTrackingUnit() {
  const {
    isConnected,
    connectionState,
    latestData,
    vehicleData,
    connect,
    disconnect,
    joinDeviceGroup,
    leaveDeviceGroup,
    clearData,
    setInitialData
  } = useVehicleData(50) // Keep last 50 data points

  const { unitId } = useParams<{ unitId: string }>()
  const navigate = useNavigate()

  const [trackingUnit, setTrackingUnit] = useState<TrackingUnit | null>(null)
  const [loading, setLoading] = useState(true)
  const [deviceImei, setDeviceImei] = useState('')
  const [joinedDevice, setJoinedDevice] = useState<string | null>(null)
  const [loadingCachedData, setLoadingCachedData] = useState(false)
  const toast = React.useRef<Toast>(null)

  // Fetch tracking unit data
  useEffect(() => {
    const fetchTrackingUnit = async () => {
      if (!unitId) {
        navigate('/units')
        return
      }

      try {
        setLoading(true)
        const unit = await trackingUnitApi.getTrackingUnit(unitId)
        setTrackingUnit(unit)
        setDeviceImei(unit.imeiNumber)
        
        // Load cached historical data if available
        await loadCachedData(unit.imeiNumber)
      } catch (error: any) {
        toast.current?.show({
          severity: 'error',
          summary: 'Error',
          detail: error.response?.data?.message || 'Failed to fetch tracking unit'
        })
        // Navigate back to units list if unit not found
        setTimeout(() => navigate('/units'), 2000)
      } finally {
        setLoading(false)
      }
    }

    fetchTrackingUnit()
  }, [unitId, navigate])

  // Load cached data from backend
  const loadCachedData = async (imei: string) => {
    try {
      setLoadingCachedData(true)
      const history = await vehicleDataApi.getHistory(imei, 50)
      if (history && history.length > 0) {
        setInitialData(history)
        toast.current?.show({
          severity: 'info',
          summary: 'Historical Data Loaded',
          detail: `Loaded ${history.length} cached records`,
          life: 3000
        })
      }
    } catch (error) {
      // Silently fail if no cached data available
      console.log('No cached data available for IMEI:', imei)
    } finally {
      setLoadingCachedData(false)
    }
  }

  // Auto-connect and join device group when tracking unit is loaded
  useEffect(() => {
    const autoConnectAndJoin = async () => {
      if (!trackingUnit || !trackingUnit.imeiNumber) return

      try {
        // Connect to SignalR if not already connected
        if (!isConnected) {
          await connect()
        }

        // Wait a bit for connection to establish
        await new Promise(resolve => setTimeout(resolve, 1000))

        // Auto-join the device group with just the IMEI number
        // Backend creates groups as "Device_{imei}" and the MQTT topic is "{imei}/data"
        const imei = trackingUnit.imeiNumber
        await joinDeviceGroup(imei)
        setJoinedDevice(imei)
        
        toast.current?.show({
          severity: 'success',
          summary: 'Monitoring Active',
          detail: `Now monitoring device: ${trackingUnit.imeiNumber} (Topic: ${imei}/data)`
        })
      } catch (error: any) {
        console.error('Auto-connect failed:', error)
        toast.current?.show({
          severity: 'error',
          summary: 'Connection Error',
          detail: 'Failed to join device monitoring group'
        })
      }
    }

    if (trackingUnit && !loading) {
      autoConnectAndJoin()
    }

    // Cleanup: leave device group when component unmounts
    return () => {
      if (trackingUnit?.imeiNumber) {
        leaveDeviceGroup(trackingUnit.imeiNumber).catch(console.error)
      }
    }
  }, [trackingUnit, loading])

  const handleConnect = async () => {
    try {
      await connect()
      toast.current?.show({
        severity: 'success',
        summary: 'Connected',
        detail: 'Connected to live vehicle data stream'
      })
    } catch (error: any) {
      toast.current?.show({
        severity: 'error',
        summary: 'Connection Failed',
        detail: error?.message || 'Failed to connect to vehicle data stream'
      })
    }
  }

  const handleDisconnect = async () => {
    try {
      await disconnect()
      setJoinedDevice(null)
      toast.current?.show({
        severity: 'info',
        summary: 'Disconnected',
        detail: 'Disconnected from vehicle data stream'
      })
    } catch (error) {
      toast.current?.show({
        severity: 'error',
        summary: 'Error',
        detail: 'Error disconnecting from vehicle data stream'
      })
    }
  }

  const handleJoinDevice = async () => {
    if (!deviceImei.trim()) return

    try {
      if (joinedDevice) {
        await leaveDeviceGroup(joinedDevice)
      }
      await joinDeviceGroup(deviceImei.trim())
      setJoinedDevice(deviceImei.trim())
      toast.current?.show({
        severity: 'success',
        summary: 'Device Joined',
        detail: `Now monitoring device: ${deviceImei.trim()}`
      })
    } catch (error) {
      toast.current?.show({
        severity: 'error',
        summary: 'Error',
        detail: 'Failed to join device group'
      })
    }
  }

  const handleLeaveDevice = async () => {
    if (!joinedDevice) return

    try {
      await leaveDeviceGroup(joinedDevice)
      setJoinedDevice(null)
      toast.current?.show({
        severity: 'info',
        summary: 'Device Left',
        detail: `Stopped monitoring device: ${joinedDevice}`
      })
    } catch (error) {
      toast.current?.show({
        severity: 'error',
        summary: 'Error',
        detail: 'Failed to leave device group'
      })
    }
  }

  const getConnectionBadge = () => {
    switch (connectionState) {
      case 'Connected':
        return <Badge value="Connected" severity="success" />
      case 'Reconnecting':
        return <Badge value="Reconnecting" severity="warning" />
      case 'Disconnected':
        return <Badge value="Disconnected" severity="danger" />
      default:
        return <Badge value={connectionState} severity="info" />
    }
  }

  const timestampTemplate = (data: VehicleDataMessage) => {
    return new Date(data.timestamp).toLocaleString()
  }

  const locationTemplate = (data: VehicleDataMessage) => {
    if (data.latitude && data.longitude) {
      return `${data.latitude.toFixed(6)}, ${data.longitude.toFixed(6)}`
    }
    return '-'
  }

  const speedTemplate = (data: VehicleDataMessage) => {
    return data.speed ? `${data.speed.toFixed(1)} km/h` : '-'
  }

  const coords = trackingUnit && latestData && latestData.latitude && latestData.longitude
    ? [latestData.latitude, latestData.longitude]
    : null  
    
    const getBatteryVoltageColor = (voltage: number | undefined) => {
      if (voltage === undefined) return "bg-gray-500";
      if (voltage >= 12.0) return "bg-green-600";
      if (voltage >= 11.5) return "bg-yellow-500";
      if (voltage >= 10.5) return "bg-yellow-300";
      return "bg-red-500";
    }

    const getEngineStateColor = (voltage: number | undefined, ignition: boolean | undefined) => {
      if (voltage === undefined) return "bg-gray-500";
      if (voltage >= 12.88 && ignition) return "bg-green-600";
      return "bg-red-500";
    }

    const getEngineState = (voltage: number | undefined, ignition: boolean | undefined, movement: boolean | undefined) => {
      if (!ignition) return "OFF";
      if (voltage === undefined || voltage < 12.88) return "OFF";
      if (movement) return "Running";
      return "Idling";
    }

  const CardHeader = () => {
    return (
<div className="mt-4 h-86 flex justify-between gap-5">
        <div className='grid grid-cols-2 md:grid-cols-3 gap-4 h-full mb-4 flex flex-grow max-w-xl p-3'>
                <MetricCard title="Speed" value={latestData?.speed !== undefined ? `${latestData.speed.toFixed(1)} km/h` : '-'} />
                <MetricCard title="Distance" value={latestData?.distance !== undefined ? `${latestData.distance.toFixed(1)} km` : '- -'} />
                <MetricCard title="RPM" value={latestData?.rpm !== undefined ? `${latestData.rpm.toFixed(1)} rpm` : '- -'} />
                <MetricCard title="Ignition" value={latestData?.ignition ? "ON" : "OFF"} color={latestData?.ignition ? "bg-green-600" : "bg-red-500"} />
                <MetricCard title="Battery" value={`${latestData?.batteryVoltage?.toFixed(2) ?? '-'} V`} color={getBatteryVoltageColor(latestData?.batteryVoltage)} />
                <MetricCard title="Engine" value={getEngineState(latestData?.batteryVoltage, latestData?.ignition, !!latestData?.speed && latestData.speed > 0)} color={getEngineStateColor(latestData?.batteryVoltage, latestData?.ignition)} />
        </div>
        <div className='min-h-64 w-1/2'>
           {latestData?.latitude && latestData?.longitude && (<>
              <VehicleMap longitude={latestData?.longitude} latitude={latestData?.latitude} />

              <div className='flex justify-between items-center bg-slate-100 p-2'>
                <label className="text-sm font-medium text-gray-600">Location</label>
                <p className="text-lg">{latestData.latitude.toFixed(6)}, {latestData.longitude.toFixed(6)}</p>
              </div>
           </>
            )}
        </div>
        </div>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <ProgressSpinner />
      </div>
    )
  }

  if (!trackingUnit) {
    return (
      <div className="p-6 container mx-auto">
        <Toast ref={toast} />
        <Card>
          <p className="text-center text-gray-600">Tracking unit not found</p>
        </Card>
      </div>
    )
  }

  return (
    <div className="p-6 container mx-auto">
      <Toast ref={toast} />
      
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-xl font-bold">Manage Tracking Unit</h1>
          <p className="text-sm text-gray-600">
            {trackingUnit.serialNumber} - IMEI: {trackingUnit.imeiNumber}
          </p>
          {loadingCachedData && (
            <Badge value="Loading cached data..." severity="info" className="mt-2" />
          )}
        </div>
        {getConnectionBadge()}
      </div>

      {/* Unit Information */}
      <Card className="mb-4" header={<CardHeader />}>
        <h3 className="text-lg font-semibold mb-3">Unit Information</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <label className="text-sm font-medium text-gray-600">IMEI Number</label>
            <p className="text-lg font-semibold">{trackingUnit.imeiNumber}</p>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-600">Serial Number</label>
            <p className="text-lg">{trackingUnit.serialNumber}</p>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-600">Model</label>
            <p className="text-lg">{trackingUnit.model || '-'}</p>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-600">Manufacturer</label>
            <p className="text-lg">{trackingUnit.manufacturer || '-'}</p>
          </div>
           { latestData && <div>
              <label className="text-sm font-medium text-gray-600">Timestamp</label>
              <p className="text-lg">{new Date(latestData.timestamp).toLocaleString()}</p>
            </div>}
          <div>
            <label className="text-sm font-medium text-gray-600">Status</label>
            <p className="text-lg">
              <Badge value={trackingUnit.isActive ? 'Active' : 'Inactive'} severity={trackingUnit.isActive ? 'success' : 'danger'} />
            </p>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-600">Vehicle</label>
            <p className="text-lg">{trackingUnit.vehicle?.name || 'Not Assigned'}</p>
          </div>
          {latestData?.speed !== undefined && (
              <div>
                <label className="text-sm font-medium text-gray-600">Speed</label>
                <p className="text-lg">{latestData.speed.toFixed(1)} km/h</p>
              </div>
            )}
          
        </div>
        
      </Card>

      {/* Connection Controls */}
      <Card className="mb-4">
        <h3 className="text-lg font-semibold mb-3">Connection Controls</h3>
        <div className="flex gap-2 items-center mb-4">
          <Button
            label={isConnected ? 'Disconnect' : 'Connect'}
            icon={isConnected ? 'pi pi-times' : 'pi pi-play'}
            onClick={isConnected ? handleDisconnect : handleConnect}
            severity={isConnected ? 'danger' : 'success'}
            size="small"
          />
          <Button
            label="Clear Data"
            icon="pi pi-trash"
            onClick={clearData}
            severity="secondary"
            size="small"
          />
        </div>

        {/* Device-specific monitoring */}
        <div className="flex gap-2 items-center hidden">
          <InputText
            value={deviceImei}
            onChange={(e) => setDeviceImei(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && deviceImei.trim() && isConnected) {
                handleJoinDevice()
              }
            }}
            disabled
            placeholder="Enter device IMEI"
            className="flex-1"
          />
          <Button
            label={joinedDevice ? 'Leave Device' : 'Join Device'}
            icon={joinedDevice ? 'pi pi-times' : 'pi pi-plus'}
            onClick={joinedDevice ? handleLeaveDevice : handleJoinDevice}
            severity={joinedDevice ? 'danger' : 'info'}
            size="small"
            disabled={!isConnected || (!deviceImei.trim() && !joinedDevice)}
          />
        </div>
        
        {joinedDevice && (
          <div className="mt-2">
            <Badge value={`Monitoring: ${joinedDevice}`} severity="info" />
          </div>
        )}
      </Card>


      {/* Data History */}
      <Card>
        <h3 className="text-lg font-semibold mb-3">Data History ({vehicleData.length} records)</h3>
        <DataTable
          value={vehicleData}
          size="small"
          paginator
          rows={10}
          emptyMessage="No vehicle data received"
          rowsPerPageOptions={[10, 25, 50]}
        >
          <Column field="imei" header="IMEI" sortable />
          <Column field="timestamp" header="Timestamp" body={timestampTemplate} sortable />
          <Column field="location" header="Location" body={locationTemplate} />
          <Column field="speed" header="Speed" body={speedTemplate} sortable />
          <Column field="satellites" header="Satellites" sortable />
          <Column field="batteryVoltage" header="Battery" sortable />
        </DataTable>
      </Card>

      {/* Vehicle Events */}
      {trackingUnit && (
        <div className="mt-4">
          <VehicleEventsTable unitId={trackingUnit.id} />
        </div>
      )}
    </div>
  )
}


const MetricCard = ({ title, value, color }: { title: string; value: string; color?: string }) => {
    return (
        <div className="shadow-sm bg-white rounded overflow-hidden flex flex-col">
            <h2 className="px-3 py-2">{title}</h2>
            <div className={`flex items-center justify-center flex-1 h-full ${color ?? "bg-gray-500"} text-white`}>
               <p className="text-2xl p-3">{value}</p>
            </div>
        </div>
    );
}