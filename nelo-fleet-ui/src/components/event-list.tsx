
import React, { useState, useEffect } from 'react';
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { Badge } from 'primereact/badge';
import { Tag } from 'primereact/tag';
import { Card } from 'primereact/card';
import { InputText } from 'primereact/inputtext';
import { Dropdown } from 'primereact/dropdown';
import { Calendar } from 'primereact/calendar';

interface VehicleEvent {
    id: string;
    vehicleId: string;
    vehicleName: string;
    plateNumber: string;
    eventType: string;
    description: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    timestamp: Date;
    location?: {
        latitude: number;
        longitude: number;
        address?: string;
    };
    speed?: number;
    fuelLevel?: number;
    driver?: string;
    acknowledged: boolean;
}

const getSampleEvents = (): VehicleEvent[] => {
    const vehicles = [
        { id: '1', name: 'Fleet Truck 001', plate: 'ABC-1234' },
        { id: '2', name: 'Delivery Van 002', plate: 'DEF-5678' },
        { id: '3', name: 'Service Car 003', plate: 'GHI-9012' },
        { id: '4', name: 'Pickup Truck 004', plate: 'JKL-3456' },
        { id: '5', name: 'Company SUV 005', plate: 'MNO-7890' }
    ];

    const eventTypes = [
        { type: 'ignition_on', description: 'Ignition turned on', severity: 'low' as const },
        { type: 'ignition_off', description: 'Ignition turned off', severity: 'low' as const },
        { type: 'speeding', description: 'Speed limit exceeded', severity: 'high' as const },
        { type: 'harsh_braking', description: 'Harsh braking detected', severity: 'medium' as const },
        { type: 'harsh_acceleration', description: 'Harsh acceleration detected', severity: 'medium' as const },
        { type: 'low_fuel', description: 'Low fuel level warning', severity: 'medium' as const },
        { type: 'engine_fault', description: 'Engine fault detected', severity: 'critical' as const },
        { type: 'unauthorized_use', description: 'Unauthorized vehicle use', severity: 'critical' as const },
        { type: 'maintenance_due', description: 'Maintenance reminder', severity: 'low' as const },
        { type: 'geofence_exit', description: 'Vehicle left allowed area', severity: 'high' as const },
        { type: 'geofence_entry', description: 'Vehicle entered restricted area', severity: 'high' as const },
        { type: 'idle_timeout', description: 'Extended idling detected', severity: 'low' as const }
    ];

    const drivers = ['John Smith', 'Sarah Johnson', 'Mike Wilson', 'Lisa Brown', 'Tom Davis'];
    const locations = [
        { lat: 37.7749, lng: -122.4194, address: '123 Market St, San Francisco, CA' },
        { lat: 37.7849, lng: -122.4094, address: '456 Mission St, San Francisco, CA' },
        { lat: 37.7649, lng: -122.4294, address: '789 Howard St, San Francisco, CA' },
        { lat: 37.7549, lng: -122.4394, address: '321 Folsom St, San Francisco, CA' },
        { lat: 37.7449, lng: -122.4494, address: '654 Bryant St, San Francisco, CA' }
    ];

    const events: VehicleEvent[] = [];
    
    for (let i = 0; i < 50; i++) {
        const vehicle = vehicles[Math.floor(Math.random() * vehicles.length)];
        const eventType = eventTypes[Math.floor(Math.random() * eventTypes.length)];
        const location = locations[Math.floor(Math.random() * locations.length)];
        const driver = drivers[Math.floor(Math.random() * drivers.length)];
        
        // Generate timestamp within last 7 days
        const timestamp = new Date();
        timestamp.setHours(timestamp.getHours() - Math.floor(Math.random() * 168));
        
        events.push({
            id: `event_${i + 1}`,
            vehicleId: vehicle.id,
            vehicleName: vehicle.name,
            plateNumber: vehicle.plate,
            eventType: eventType.type,
            description: eventType.description,
            severity: eventType.severity,
            timestamp,
            location: {
                latitude: location.lat,
                longitude: location.lng,
                address: location.address
            },
            speed: eventType.type === 'speeding' ? Math.floor(Math.random() * 30) + 80 : Math.floor(Math.random() * 60) + 20,
            fuelLevel: eventType.type === 'low_fuel' ? Math.floor(Math.random() * 15) + 5 : Math.floor(Math.random() * 80) + 20,
            driver: Math.random() > 0.2 ? driver : undefined,
            acknowledged: Math.random() > 0.3
        });
    }

    return events.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
};

export default function EventsList() {
    const [events, setEvents] = useState<VehicleEvent[]>([]);
    const [filteredEvents, setFilteredEvents] = useState<VehicleEvent[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedSeverity, setSelectedSeverity] = useState<{name: string, code: string} | null>(null);
    const [selectedEventType, setSelectedEventType] = useState<{name: string, code: string} | null>(null);
    const [dateFilter, setDateFilter] = useState<Date | null>(null);

    const severityOptions = [
        { name: 'Low', code: 'low' },
        { name: 'Medium', code: 'medium' },
        { name: 'High', code: 'high' },
        { name: 'Critical', code: 'critical' }
    ];

    const eventTypeOptions = [
        { name: 'Ignition On', code: 'ignition_on' },
        { name: 'Ignition Off', code: 'ignition_off' },
        { name: 'Speeding', code: 'speeding' },
        { name: 'Harsh Braking', code: 'harsh_braking' },
        { name: 'Harsh Acceleration', code: 'harsh_acceleration' },
        { name: 'Low Fuel', code: 'low_fuel' },
        { name: 'Engine Fault', code: 'engine_fault' },
        { name: 'Unauthorized Use', code: 'unauthorized_use' },
        { name: 'Maintenance Due', code: 'maintenance_due' },
        { name: 'Geofence Exit', code: 'geofence_exit' },
        { name: 'Geofence Entry', code: 'geofence_entry' },
        { name: 'Idle Timeout', code: 'idle_timeout' }
    ];

    useEffect(() => {
        const sampleEvents = getSampleEvents();
        setEvents(sampleEvents);
        setFilteredEvents(sampleEvents);
    }, []);

    useEffect(() => {
        let filtered = events;

        // Filter by search term
        if (searchTerm) {
            filtered = filtered.filter(event => 
                event.vehicleName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                event.plateNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
                event.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                event.driver?.toLowerCase().includes(searchTerm.toLowerCase())
            );
        }

        // Filter by severity
        if (selectedSeverity) {
            filtered = filtered.filter(event => event.severity === selectedSeverity.code);
        }

        // Filter by event type
        if (selectedEventType) {
            filtered = filtered.filter(event => event.eventType === selectedEventType.code);
        }

        // Filter by date
        if (dateFilter) {
            const filterDate = new Date(dateFilter);
            filterDate.setHours(0, 0, 0, 0);
            const nextDay = new Date(filterDate);
            nextDay.setDate(nextDay.getDate() + 1);
            
            filtered = filtered.filter(event => {
                const eventDate = new Date(event.timestamp);
                return eventDate >= filterDate && eventDate < nextDay;
            });
        }

        setFilteredEvents(filtered);
    }, [events, searchTerm, selectedSeverity, selectedEventType, dateFilter]);

    // Template functions for custom column rendering
    const severityBodyTemplate = (event: VehicleEvent) => {
        const getSeverityColor = (severity: string) => {
            switch (severity) {
                case 'critical': return 'danger';
                case 'high': return 'warning';
                case 'medium': return 'info';
                case 'low': return 'success';
                default: return 'info';
            }
        };

        return <Badge value={event.severity.toUpperCase()} severity={getSeverityColor(event.severity)} />;
    };

    const eventTypeBodyTemplate = (event: VehicleEvent) => {
        const getEventTypeColor = (eventType: string) => {
            switch (eventType) {
                case 'engine_fault':
                case 'unauthorized_use':
                    return 'danger';
                case 'speeding':
                case 'geofence_exit':
                case 'geofence_entry':
                    return 'warning';
                case 'harsh_braking':
                case 'harsh_acceleration':
                case 'low_fuel':
                    return 'info';
                default:
                    return 'success';
            }
        };

        const displayName = eventTypeOptions.find(option => option.code === event.eventType)?.name || event.eventType;
        return <Tag value={displayName} severity={getEventTypeColor(event.eventType)} />;
    };

    const timestampBodyTemplate = (event: VehicleEvent) => {
        return new Intl.DateTimeFormat('en-US', {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        }).format(event.timestamp);
    };

    const acknowledgedBodyTemplate = (event: VehicleEvent) => {
        return (
            <Badge 
                value={event.acknowledged ? 'ACK' : 'NEW'} 
                severity={event.acknowledged ? 'success' : 'warning'} 
            />
        );
    };

    const speedBodyTemplate = (event: VehicleEvent) => {
        return event.speed ? `${event.speed} km/h` : '-';
    };

    const fuelBodyTemplate = (event: VehicleEvent) => {
        return event.fuelLevel ? `${event.fuelLevel}%` : '-';
    };

    return (
        <div className="py-6">
            <div className="flex justify-between items-center mb-6">
                <h1 className="flex items-center gap-2 text-xl font-bold">Event list
                <Badge value={`${filteredEvents.length} events`} severity="info" />
                </h1>
                

                <div className="grid grid-cols-1 md:grid-cols-5 gap-2 ml-auto">
                    <div />
                    <span className="relative flex items-center">
                        <InputText 
                            placeholder="Search events..." 
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full p-inputtext-sm h-9"
                        />
                        <i className="pi pi-search absolute right-3" />

                    </span>
                    
                    <Dropdown 
                        value={selectedSeverity} 
                        onChange={(e) => setSelectedSeverity(e.value)} 
                        options={severityOptions} 
                        optionLabel="name" 
                        placeholder="Filter by Severity" 
                        className="w-full items-center p-inputtext-sm h-9"
                        showClear
                    />

                    <Dropdown 
                        value={selectedEventType} 
                        onChange={(e) => setSelectedEventType(e.value)} 
                        options={eventTypeOptions} 
                        optionLabel="name" 
                        placeholder="Filter by Event Type" 
                        className="w-full flex items-center p-inputtext-sm h-9"
                        showClear
                    />

                    <Calendar
                        value={dateFilter}
                        onChange={(e) => setDateFilter(e.value as Date)}
                        placeholder="Filter by Date"
                        dateFormat="mm/dd/yy"
                        className="w-full p-inputtext-sm h-9"
                        showIcon
                        showClear
                    />
                </div>
            </div>
                    
            <Card className="mt-4" pt={{ body: { className: "px-0!" } }}>

            <DataTable 
                value={filteredEvents}
                paginator 
                rows={7}
                tableStyle={{ minWidth: '100rem' }}
                emptyMessage="No events found"
                rowsPerPageOptions={[7, 10, 15, 25, 50]}
                paginatorTemplate="FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink CurrentPageReport RowsPerPageDropdown"
                currentPageReportTemplate="Showing {first} to {last} of {totalRecords} events"
                stripedRows
                size="small"
            >
                <Column field="timestamp" header="Time" body={timestampBodyTemplate} sortable style={{ minWidth: '120px' }} />
                <Column field="severity" header="Severity" body={severityBodyTemplate} sortable style={{ minWidth: '100px' }} />
                <Column field="eventType" header="Event Type" body={eventTypeBodyTemplate} sortable style={{ minWidth: '150px' }} />
                <Column field="vehicleName" header="Vehicle" sortable style={{ minWidth: '150px' }} />
                <Column field="plateNumber" header="Plate" sortable style={{ minWidth: '120px' }} />
                <Column field="description" header="Description" sortable style={{ minWidth: '200px' }} />
                <Column field="driver" header="Driver" sortable style={{ minWidth: '120px' }} />
                <Column field="speed" header="Speed" body={speedBodyTemplate} sortable style={{ minWidth: '80px' }} />
                <Column field="fuelLevel" header="Fuel" body={fuelBodyTemplate} sortable style={{ minWidth: '80px' }} />
                <Column field="acknowledged" header="Status" body={acknowledgedBodyTemplate} sortable style={{ minWidth: '80px' }} />
            </DataTable>
            </Card>

        </div>
    );
}