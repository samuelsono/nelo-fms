import React, { useState, useEffect } from 'react'
import { Card } from 'primereact/card'
import { DataTable } from 'primereact/datatable'
import { Column } from 'primereact/column'
import { Badge } from 'primereact/badge'
import { Dropdown } from 'primereact/dropdown'
import { vehicleEventsApi, type VehicleEvent } from '../apis/vehicle-events-api'
import { ProgressSpinner } from 'primereact/progressspinner'

interface VehicleEventsTableProps {
  imei?: string
  vehicleId?: string
  unitId?: string
}

export default function VehicleEventsTable({ imei, vehicleId, unitId }: VehicleEventsTableProps) {
  const [events, setEvents] = useState<VehicleEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [timespan, setTimespan] = useState('7d')
  const [error, setError] = useState<string | null>(null)

  const timespanOptions = [
    { label: 'Last Hour', value: '1h' },
    { label: 'Last 6 Hours', value: '6h' },
    { label: 'Last 24 Hours', value: '24h' },
    { label: 'Last 7 Days', value: '7d' },
    { label: 'Last 30 Days', value: '30d' }
  ]

  useEffect(() => {
    fetchEvents()
  }, [imei, vehicleId, unitId, timespan])

  const fetchEvents = async () => {
    try {
      setLoading(true)
      setError(null)

      let data: VehicleEvent[] = []

      if (imei) {
        data = await vehicleEventsApi.getEventsByImei(imei, timespan, 100)
      } else if (vehicleId) {
        data = await vehicleEventsApi.getEventsByVehicle(vehicleId, timespan, 100)
      } else if (unitId) {
        data = await vehicleEventsApi.getEventsByUnit(unitId, timespan, 100)
      }

      setEvents(data)
    } catch (error: any) {
      console.error('Error fetching vehicle events:', error)
      setError(error.response?.data?.message || 'Failed to load vehicle events')
    } finally {
      setLoading(false)
    }
  }

  const timestampTemplate = (event: VehicleEvent) => {
    return new Date(event.timestamp).toLocaleString()
  }

  const eventTypeTemplate = (event: VehicleEvent) => {
    const severityMap: Record<string, 'success' | 'info' | 'warning' | 'danger'> = {
      'TripStart': 'success',
      'TripStop': 'info',
      'IgnitionOn': 'success',
      'IgnitionOff': 'info',
      'HarshBraking': 'danger',
      'HarshAcceleration': 'warning',
      'HarshCornering': 'warning',
      'Overspeed': 'danger',
      'Idling': 'warning',
      'GeofenceEnter': 'info',
      'GeofenceExit': 'info',
      'PowerDisconnect': 'danger',
      'PowerReconnect': 'success',
      'Towing': 'danger',
      'Crash': 'danger'
    }

    const severity = severityMap[event.eventType] || 'info'
    return <Badge value={event.eventType} severity={severity} />
  }

  const locationTemplate = (event: VehicleEvent) => {
    if (event.latitude && event.longitude) {
      return `${event.latitude.toFixed(6)}, ${event.longitude.toFixed(6)}`
    }
    return '-'
  }

  const speedTemplate = (event: VehicleEvent) => {
    return event.speed ? `${event.speed.toFixed(1)} km/h` : '-'
  }

  if (error) {
    return (
      <Card>
        <div className="text-center text-red-600">
          <i className="pi pi-exclamation-circle mr-2"></i>
          {error}
        </div>
      </Card>
    )
  }

  return (
    <Card>
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold">Vehicle Events ({events.length})</h3>
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium">Timespan:</label>
          <Dropdown
            value={timespan}
            options={timespanOptions}
            onChange={(e) => setTimespan(e.value)}
            className="w-40"
          />
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center items-center py-8">
          <ProgressSpinner style={{ width: '50px', height: '50px' }} />
        </div>
      ) : (
        <DataTable
          value={events}
          size="small"
          paginator
          rows={10}
          emptyMessage="No events found"
          rowsPerPageOptions={[10, 25, 50]}
          sortField="timestamp"
          sortOrder={-1}
        >
          <Column field="timestamp" header="Timestamp" body={timestampTemplate} sortable />
          <Column field="eventType" header="Event" body={eventTypeTemplate} sortable />
          <Column field="description" header="Description" sortable />
          <Column field="location" header="Location" body={locationTemplate} />
          <Column field="speed" header="Speed" body={speedTemplate} sortable />
        </DataTable>
      )}
    </Card>
  )
}
