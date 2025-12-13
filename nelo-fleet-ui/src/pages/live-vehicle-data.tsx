import React, { useState } from 'react'
import { Card } from 'primereact/card'
import { Button } from 'primereact/button'
import { Badge } from 'primereact/badge'
import { DataTable } from 'primereact/datatable'
import { Column } from 'primereact/column'
import { InputText } from 'primereact/inputtext'
import { Toast } from 'primereact/toast'
import { useVehicleData } from '../hooks/useVehicleData'
import { type VehicleDataMessage } from '../services/vehicleDataService'

export default function LiveVehicleData() {
  const {
    isConnected,
    connectionState,
    latestData,
    vehicleData,
    connect,
    disconnect,
    joinDeviceGroup,
    leaveDeviceGroup,
    clearData
  } = useVehicleData(50) // Keep last 50 data points

  const [deviceImei, setDeviceImei] = useState('')
  const [joinedDevice, setJoinedDevice] = useState<string | null>(null)
  const toast = React.useRef<Toast>(null)

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

  return (
    <div className="p-6 container mx-auto">
      <Toast ref={toast} />
      
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-xl font-bold">Live Vehicle Data</h1>
        {getConnectionBadge()}
      </div>

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
        <div className="flex gap-2 items-center">
          <InputText
            value={deviceImei}
            onChange={(e) => setDeviceImei(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && deviceImei.trim() && isConnected) {
                handleJoinDevice()
              }
            }}
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

      {/* Latest Data */}
      {latestData && (
        <Card className="mb-4">
          <h3 className="text-lg font-semibold mb-3">Latest Data Values</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-600">IMEI</label>
              <p className="text-lg font-semibold">{latestData.imei}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-600">Timestamp</label>
              <p className="text-lg">{new Date(latestData.timestamp).toLocaleString()}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-600">Ignition</label>
              <p className="text-lg font-semibold">
                {latestData.ignition !== undefined ? (
                  <Badge value={latestData.ignition ? "ON" : "OFF"} severity={latestData.ignition ? "success" : "danger"} />
                ) : (
                  <span className="text-gray-400">-</span>
                )}
              </p>
            </div>
            {latestData.latitude && latestData.longitude && (
              <div>
                <label className="text-sm font-medium text-gray-600">Location</label>
                <p className="text-lg">{latestData.latitude.toFixed(6)}, {latestData.longitude.toFixed(6)}</p>
              </div>
            )}
            {latestData.speed !== undefined && (
              <div>
                <label className="text-sm font-medium text-gray-600">Speed</label>
                <p className="text-lg">{latestData.speed.toFixed(1)} km/h</p>
              </div>
            )}
            {latestData.batteryVoltage !== undefined && (
              <div>
                <label className="text-sm font-medium text-gray-600">Battery</label>
                <p className="text-lg">{latestData.batteryVoltage.toFixed(2)} V</p>
              </div>
            )}
          </div>
        </Card>
      )}

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
    </div>
  )
}