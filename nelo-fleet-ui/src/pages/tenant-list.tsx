import React, { useState, useEffect } from 'react';
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { type Tenant, tenantApi } from '../apis/tenant-api';
import { Button } from 'primereact/button';
import { Dropdown } from 'primereact/dropdown';
import { InputText } from 'primereact/inputtext';
import { Card } from 'primereact/card';
import { Badge } from 'primereact/badge';
import { Toast } from 'primereact/toast';

export default function TenantList() {
    const [tenants, setTenants] = useState<Tenant[]>([]);
    const [loading, setLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedStatus, setSelectedStatus] = useState<{name: string, code: string} | null>(null);
    const toast = React.useRef<Toast>(null);

    const statusOptions = [
        { name: 'Active', code: 'true' },
        { name: 'Inactive', code: 'false' }
    ];

    const fetchTenants = async () => {
        setLoading(true);
        try {
            const data = await tenantApi.getTenants();
            setTenants(data);
        } catch (error: any) {
            toast.current?.show({
                severity: 'error',
                summary: 'Error',
                detail: error.response?.data?.message || 'Failed to fetch tenants'
            });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchTenants();
    }, []);

    // Filter tenants based on search term and selected status
    const filteredTenants = tenants.filter(tenant => {
        const matchesSearch = searchTerm === '' || 
            tenant.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            tenant.contactEmail?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            tenant.contactPhone?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            tenant.address?.toLowerCase().includes(searchTerm.toLowerCase());

        const matchesStatus = selectedStatus === null || 
            tenant.isActive.toString() === selectedStatus.code;

        return matchesSearch && matchesStatus;
    });

    // Status badge template
    const statusBodyTemplate = (tenant: Tenant) => {
        return (
            <Badge 
                value={tenant.isActive ? 'Active' : 'Inactive'} 
                severity={tenant.isActive ? 'success' : 'danger'} 
            />
        );
    };

    const navColumn = (tenant: Tenant) => {
        return <a href={`/tenants/${tenant.id}`} className="text-green-600 hover:underline">{tenant.name}</a>;
    };

    // Contact info template
    const contactBodyTemplate = (tenant: Tenant) => {
        return tenant.contactEmail || tenant.contactPhone || '-';
    };

    // Vehicle count template
    const vehicleCountBodyTemplate = (tenant: Tenant) => {
        return tenant.vehicleCount || 0;
    };

    // Created date template
    const createdAtBodyTemplate = (tenant: Tenant) => {
        const date = new Date(tenant.createdAt);
        return new Intl.DateTimeFormat('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        }).format(date);
    };

    return (
        <div className="p-6 container mx-auto">
            <Toast ref={toast} />
            
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-xl font-bold">Tenants</h1>
                
            
                <div className="flex gap-2 items-center">
                    <span className="relative flex items-center">
                        <InputText 
                            placeholder="Search tenants..." 
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
                        onClick={fetchTenants}
                        loading={loading}
                    />
                    <Button 
                        label="Add Tenant" 
                        icon="pi pi-plus" 
                        className="p-button-sm"
                        onClick={() => {
                            toast.current?.show({
                                severity: 'info',
                                summary: 'Info',
                                detail: 'Add Tenant functionality will be implemented'
                            });
                        }}
                    />
                </div>
            </div>

            <Card className="mb-4 px-0!" pt={{ body: { className: "px-0!" } }}>
            
            <DataTable 
                value={filteredTenants} 
                loading={loading}
                size='small'
                paginator 
                rows={10}
                tableStyle={{ minWidth: '80rem' }}
                emptyMessage="No tenants found"
                rowsPerPageOptions={[5, 10, 25, 50]}
                paginatorTemplate="FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink CurrentPageReport RowsPerPageDropdown"
                currentPageReportTemplate="Showing {first} to {last} of {totalRecords} tenants"
            >
                <Column field="name" header="Tenant Name" sortable body={navColumn} />
                <Column field="contactEmail" header="Email" sortable />
                <Column field="contactPhone" header="Phone" sortable />
                <Column field="address" header="Address" sortable />
                <Column field="isActive" header="Status" body={statusBodyTemplate} sortable />
                <Column field="vehicleCount" header="Vehicles" body={vehicleCountBodyTemplate} />
                <Column field="createdAt" header="Created" body={createdAtBodyTemplate} sortable />
            </DataTable>
            </Card>

        </div>
    );
}