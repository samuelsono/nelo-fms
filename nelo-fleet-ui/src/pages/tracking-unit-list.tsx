import React, { useState, useEffect, useRef } from 'react';
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { type TrackingUnit, trackingUnitApi } from '../apis/tracking-unit-api';
import { Button } from 'primereact/button';
import { Dropdown } from 'primereact/dropdown';
import { InputText } from 'primereact/inputtext';
import { Card } from 'primereact/card';
import { Badge } from 'primereact/badge';
import { Toast } from 'primereact/toast';
import AddUnitModal from '../components/add-unit-model';
import { Menu } from 'primereact/menu';
import EditUnitModal from '../components/edit-unit-modal';

export default function TrackingUnitList() {
    const [trackingUnits, setTrackingUnits] = useState<TrackingUnit[]>([]);
    const [loading, setLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedStatus, setSelectedStatus] = useState<{name: string, code: string} | null>(null);
    const toast = React.useRef<Toast>(null);

    const statusOptions = [
        { name: 'Active', code: 'true' },
        { name: 'Inactive', code: 'false' }
    ];

    const fetchTrackingUnits = async () => {
        setLoading(true);
        try {
            const data = await trackingUnitApi.getTrackingUnits();
            setTrackingUnits(data);
        } catch (error: any) {
            toast.current?.show({
                severity: 'error',
                summary: 'Error',
                detail: error.response?.data?.message || 'Failed to fetch tracking units'
            });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchTrackingUnits();
    }, []);

    // Filter tracking units based on search term and selected status
    const filteredTrackingUnits = trackingUnits.filter(unit => {
        const matchesSearch = searchTerm === '' || 
            unit.imeiNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
            unit.serialNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
            unit.model?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            unit.manufacturer?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            unit.vehicle?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            unit.vehicle?.plateNumber.toLowerCase().includes(searchTerm.toLowerCase());

        const matchesStatus = selectedStatus === null || 
            unit.isActive.toString() === selectedStatus.code;

        return matchesSearch && matchesStatus;
    });

    // Status badge template
    const statusBodyTemplate = (unit: TrackingUnit) => {
        return (
            <Badge 
                value={unit.isActive ? 'Active' : 'Inactive'} 
                severity={unit.isActive ? 'success' : 'danger'} 
            />
        );
    };

    const navColumn = (unit: TrackingUnit) => {
        return <a href={`/tracking-units/${unit.id}`} className="text-green-600 hover:underline">{unit.serialNumber}</a>;
    };

    const imeiColumn = (unit: TrackingUnit) => {
        return <a href={`/tracking-units/${unit.id}`} className="text-green-600 hover:underline">{unit.imeiNumber}</a>;
    };

    // Vehicle template
    const vehicleBodyTemplate = (unit: TrackingUnit) => {
        return unit.vehicle?.name || '-';
    };

    // SIM Card template
    const simCardBodyTemplate = (unit: TrackingUnit) => {
        return unit.simCard?.msisdn || '-';
    };

    // Last communication template
    const lastCommBodyTemplate = (unit: TrackingUnit) => {
        if (unit.lastCommunication) {
            const date = new Date(unit.lastCommunication);
            return new Intl.DateTimeFormat('en-US', {
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            }).format(date);
        }
        return '-';
    };

    const UnitMenu = (trackingUnit: TrackingUnit) => {
    const menuRight = useRef(null);
    const [visible, setVisible] = useState(false);

    const items = [
        {
            label: 'Options',
            items: [
                {
                    label: 'Edit Unit',
                    icon: 'pi pi-pencil',
                    command: () => setVisible(true)
                },
                {
                    label: 'Assign Unit',
                    icon: 'pi pi-user-plus'
                },
            ]
        }
    ];
    return (
        <div className="flex flex-col gap-2">
            <EditUnitModal trackingUnit={trackingUnit} openModal={visible} setOpenModal={setVisible} onUnitAdded={fetchTrackingUnits} />
            <Menu model={items} popup ref={menuRight} id="popup_menu_right" popupAlignment="right" />
            <Button size='small' text icon="pi pi-ellipsis-v" onClick={(event) => menuRight.current.toggle(event)} aria-controls="popup_menu_right" aria-haspopup />
        </div>
    );
}

    return (
        <div className="p-6 container mx-auto">
            <Toast ref={toast} />
            
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-xl font-bold">Tracking Units</h1>
                
            
                <div className="flex gap-2 items-center">
                    <span className="relative flex items-center">
                        <InputText 
                            placeholder="Search tracking units..." 
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
                        onClick={fetchTrackingUnits}
                        loading={loading}
                    />
                    <AddUnitModal onUnitAdded={fetchTrackingUnits} />
                </div>
            </div>

            <Card className="mb-4 px-0!" pt={{ body: { className: "px-0!" } }}>
            
            <DataTable 
                value={filteredTrackingUnits} 
                loading={loading}
                size='small'
                paginator 
                rows={10}
                tableStyle={{ minWidth: '80rem' }}
                emptyMessage="No tracking units found"
                rowsPerPageOptions={[5, 10, 25, 50]}
                paginatorTemplate="FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink CurrentPageReport RowsPerPageDropdown"
                currentPageReportTemplate="Showing {first} to {last} of {totalRecords} tracking units"
            >
                <Column field="imeiNumber" body={imeiColumn} header="IMEI Number" sortable />
                <Column field="serialNumber" header="Serial Number" sortable body={navColumn} />
                <Column field="model" header="Model" sortable />
                <Column field="manufacturer" header="Manufacturer" sortable />
                <Column field="firmwareVersion" header="Firmware" sortable />
                <Column field="isActive" header="Status" body={statusBodyTemplate} sortable />
                <Column field="vehicle" header="Vehicle" body={vehicleBodyTemplate} />
                <Column field="simCard" header="SIM Card" body={simCardBodyTemplate} />
                <Column field="lastCommunication" header="Last Comm" body={lastCommBodyTemplate} sortable />
                <Column header="Actions" body={UnitMenu} />
            </DataTable>
            </Card>

        </div>
    );
}


