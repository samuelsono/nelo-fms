import React, { useState, useEffect } from 'react';
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { type Driver, driverApi } from '../apis/driver-api';
import { Button } from 'primereact/button';
import { Dropdown } from 'primereact/dropdown';
import { InputText } from 'primereact/inputtext';
import { Card } from 'primereact/card';
import { Badge } from 'primereact/badge';
import { Toast } from 'primereact/toast';

export default function DriverList() {
    const [drivers, setDrivers] = useState<Driver[]>([]);
    const [loading, setLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedStatus, setSelectedStatus] = useState<{name: string, code: string} | null>(null);
    const toast = React.useRef<Toast>(null);

    const statusOptions = [
        { name: 'Active', code: 'true' },
        { name: 'Inactive', code: 'false' }
    ];

    const fetchDrivers = async () => {
        setLoading(true);
        try {
            const data = await driverApi.getDrivers();
            setDrivers(data);
        } catch (error: any) {
            toast.current?.show({
                severity: 'error',
                summary: 'Error',
                detail: error.response?.data?.message || 'Failed to fetch drivers'
            });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchDrivers();
    }, []);

    // Filter drivers based on search term and selected status
    const filteredDrivers = drivers.filter(driver => {
        const matchesSearch = searchTerm === '' || 
            driver.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
            driver.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            driver.phone?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            driver.licenseNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
            driver.tenant?.name.toLowerCase().includes(searchTerm.toLowerCase());

        const matchesStatus = selectedStatus === null || 
            driver.isActive.toString() === selectedStatus.code;

        return matchesSearch && matchesStatus;
    });

    // Status badge template
    const statusBodyTemplate = (driver: Driver) => {
        return (
            <Badge 
                value={driver.isActive ? 'Active' : 'Inactive'} 
                severity={driver.isActive ? 'success' : 'danger'} 
            />
        );
    };

    const navColumn = (driver: Driver) => {
        return <a href={`/drivers/${driver.id}`} className="text-green-600 hover:underline">{driver.fullName}</a>;
    };

    // License info template
    const licenseBodyTemplate = (driver: Driver) => {
        return driver.licenseNumber;
    };

    // Contact template
    const contactBodyTemplate = (driver: Driver) => {
        return driver.email || driver.phone || '-';
    };

    // Current vehicle template
    const vehicleBodyTemplate = (driver: Driver) => {
        return driver.currentVehicle?.plateNumber || '-';
    };

    // Tenant template
    const tenantBodyTemplate = (driver: Driver) => {
        return driver.tenant?.name || '-';
    };

    // Age template
    const ageBodyTemplate = (driver: Driver) => {
        if (driver.dateOfBirth) {
            const age = Math.floor((Date.now() - new Date(driver.dateOfBirth).getTime()) / (365.25 * 24 * 60 * 60 * 1000));
            return age;
        }
        return '-';
    };

    return (
        <div className="p-6 container mx-auto">
            <Toast ref={toast} />
            
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-xl font-bold">Drivers</h1>
                
            
                <div className="flex gap-2 items-center">
                    <span className="relative flex items-center">
                        <InputText 
                            placeholder="Search drivers..." 
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-96 p-inputtext-sm h-9 pr-10"
                        />
                        <i className="pi pi-search absolute right-2" />
                    </span>
                    
                    <Dropdown 
                        value={selectedStatus} 
                        onChange={(e) => setSelectedStatus(e.value)} 
                        options={statusOptions} 
                        optionLabel="name" 
                        placeholder="Filter by Status" 
                        className="flex items-center p-inputtext-sm w-48 h-9" 
                        showClear
                    />
                    
                    <Button 
                        label="Refresh" 
                        icon="pi pi-refresh" 
                        className="p-button-outlined p-button-sm"
                        onClick={fetchDrivers}
                        loading={loading}
                    />
                    <Button 
                        label="Add Driver" 
                        icon="pi pi-plus" 
                        className="p-button-sm"
                        onClick={() => {
                            toast.current?.show({
                                severity: 'info',
                                summary: 'Info',
                                detail: 'Add Driver functionality will be implemented'
                            });
                        }}
                    />
                </div>
            </div>

            <Card className="mb-4 px-0!" pt={{ body: { className: "px-0!" } }}>
            
            <DataTable 
                value={filteredDrivers} 
                loading={loading}
                size='small'
                paginator 
                rows={10}
                tableStyle={{ minWidth: '80rem' }}
                emptyMessage="No drivers found"
                rowsPerPageOptions={[5, 10, 25, 50]}
                paginatorTemplate="FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink CurrentPageReport RowsPerPageDropdown"
                currentPageReportTemplate="Showing {first} to {last} of {totalRecords} drivers"
            >
                <Column field="fullName" header="Driver Name" sortable body={navColumn} />
                <Column field="email" header="Email" sortable />
                <Column field="phone" header="Phone" sortable />
                <Column field="licenseNumber" header="License" body={licenseBodyTemplate} sortable />
                <Column field="age" header="Age" body={ageBodyTemplate} />
                <Column field="isActive" header="Status" body={statusBodyTemplate} sortable />
                <Column field="currentVehicle" header="Vehicle" body={vehicleBodyTemplate} />
                <Column field="tenant" header="Tenant" body={tenantBodyTemplate} />
            </DataTable>
            </Card>

        </div>
    );
}