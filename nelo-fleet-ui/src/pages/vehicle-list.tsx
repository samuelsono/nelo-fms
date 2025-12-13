
import React, { useState, useEffect } from 'react';
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { type Vehicle, vehicleApi } from '../apis/vehicle-api';
import { Button } from 'primereact/button';
import { Dropdown } from 'primereact/dropdown';
import { InputText } from 'primereact/inputtext';
import { Card } from 'primereact/card';
import { Badge } from 'primereact/badge';
import { Toast } from 'primereact/toast';
import CreateVehicleModal from '../components/add-vehicle-modal';
import EditVehicleSidebar from '../components/edit-vehicle.sidebar';

export default function VehicleList() {
    const [vehicles, setVehicles] = useState<Vehicle[]>([]);
    const [loading, setLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedStatus, setSelectedStatus] = useState<{name: string, code: string} | null>(null);
    const [selectedVehicleId, setSelectedVehicleId] = useState<string | null>(null);
    const [selectedVehicles, setSelectedVehicles] = useState<Vehicle[]>([]);
    const [showEditSidebar, setShowEditSidebar] = useState(false);
    const toast = React.useRef<Toast>(null);

    const vehicleStatusOptions = [
        { name: 'Active', code: 'active' },
        { name: 'Inactive', code: 'inactive' },
        { name: 'Maintenance', code: 'maintenance' }
    ];

    const fetchVehicles = async () => {
        setLoading(true);
        try {
            const data = await vehicleApi.getVehicles();
            setVehicles(data);
        } catch (error: any) {
            toast.current?.show({
                severity: 'error',
                summary: 'Error',
                detail: error.response?.data?.message || 'Failed to fetch vehicles'
            });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchVehicles();
    }, []);

    // Filter vehicles based on search term and selected status
    const filteredVehicles = vehicles.filter(vehicle => {
        const matchesSearch = searchTerm === '' || 
            vehicle.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            vehicle.plateNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
            vehicle.driver?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            vehicle.make?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            vehicle.model?.toLowerCase().includes(searchTerm.toLowerCase());

        const matchesStatus = selectedStatus === null || vehicle.status === selectedStatus.code;

        return matchesSearch && matchesStatus;
    });

    // Status badge template
    const statusBodyTemplate = (vehicle: Vehicle) => {
        const getSeverity = (status: string) => {
            switch (status) {
                case 'active': return 'success';
                case 'inactive': return 'warning';
                case 'maintenance': return 'danger';
                default: return 'info';
            }
        };

        return <Badge value={vehicle.status} severity={getSeverity(vehicle.status)} />;
    };

    const navClumn = (vehicle: Vehicle) => {
        return <a href={`/vehicles/${vehicle.id}`} className="text-green-600 hover:underline">{vehicle.plateNumber}</a>;
    }

    // Fuel level template
    const fuelBodyTemplate = (vehicle: Vehicle) => {
        return vehicle.fuelLevel ? `${vehicle.fuelLevel}%` : '-';
    };

    // Odometer template
    const odometerBodyTemplate = (vehicle: Vehicle) => {
        return vehicle.odometer ? `${vehicle.odometer} km` : '-';
    };

    // Speed template
    const speedBodyTemplate = (vehicle: Vehicle) => {
        return vehicle.lastSpeed ? `${vehicle.lastSpeed} km/h` : '-';
    };

    // Tenant template
    const tenantBodyTemplate = (vehicle: Vehicle) => {
        return vehicle.tenant?.name || '-';
    };

    return (
        <div className="p-6 container mx-auto">
            <Toast ref={toast} />
            
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-xl font-bold">Vehicle Fleet</h1>
                
            
                <div className="flex gap-2 items-center">
                    <span className="relative flex items-center">
                        <InputText 
                            placeholder="Search vehicles..." 
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-96 p-inputtext-sm h-9 pr-10"
                        />
                        <i className="pi pi-search absolute right-2" />
                    </span>
                    
                    <Dropdown 
                        value={selectedStatus} 
                        onChange={(e) => setSelectedStatus(e.value)} 
                        options={vehicleStatusOptions} 
                        optionLabel="name" 
                        placeholder="Filter by Status" 
                        className="flex items-center p-inputtext-sm w-48 h-9" 
                        showClear
                    />
                    
                    <Button 
                        label="Refresh" 
                        icon="pi pi-refresh" 

                        className="p-button-outlined p-button-sm"
                        onClick={fetchVehicles}
                        loading={loading}
                    />
                    <CreateVehicleModal onSuccess={fetchVehicles} />
                </div>
            </div>

            <Card className="mb-4 px-0!" pt={{ body: { className: "px-0!" } }}>
            
            <DataTable 
                value={filteredVehicles} 
                loading={loading}
                size='small'
                paginator 
                rows={10}
                tableStyle={{ minWidth: '80rem' }}
                selectionMode={'checkbox'} selection={selectedVehicles} onSelectionChange={(e) => setSelectedVehicles(e.value)}
                emptyMessage="No vehicles found"
                rowsPerPageOptions={[5, 10, 25, 50]}
                paginatorTemplate="FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink CurrentPageReport RowsPerPageDropdown"
                currentPageReportTemplate="Showing {first} to {last} of {totalRecords} vehicles"
            >
                <Column selectionMode="multiple" headerStyle={{ width: '3rem' }}></Column>
                <Column field="plateNumber" header="Plate Number" sortable body={navClumn} />
                <Column field="name" header="Name" sortable />
                <Column field="make" header="Make" sortable />
                <Column field="model" header="Model" sortable />
                <Column field="status" header="Status" body={statusBodyTemplate} sortable />
                <Column field="driver" header="Driver" sortable />
                <Column field="fuelLevel" header="Fuel" body={fuelBodyTemplate} sortable />
                <Column field="odometer" header="Odometer" body={odometerBodyTemplate} sortable />
                <Column field="lastSpeed" header="Speed" body={speedBodyTemplate} sortable />
                <Column field="tenant.name" header="Tenant" body={tenantBodyTemplate} sortable />
                <Column field='actions' header='Actions' body={(rowData) => (
                    <div className='flex flex-end'>
                        <Button 
                            size='small' 
                            text 
                            icon="pi pi-pencil" 
                            onClick={() => {
                                setSelectedVehicleId(rowData.id);
                                setShowEditSidebar(true);
                            }} 
                        />
                    </div>
                )} />
            </DataTable>
            </Card>

            {selectedVehicleId && (
                <EditVehicleSidebar 
                    vehicleId={selectedVehicleId} 
                    visible={showEditSidebar}
                    onHide={() => {
                        setShowEditSidebar(false);
                        setSelectedVehicleId(null);
                    }}
                    onSuccess={fetchVehicles}
                />
            )}
        </div>
    );
}