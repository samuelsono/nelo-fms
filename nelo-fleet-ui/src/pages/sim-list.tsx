import React, { useState, useEffect, useRef } from 'react';
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { type SimCard, simCardApi } from '../apis/sim-card-api';
import { Button } from 'primereact/button';
import { Dropdown } from 'primereact/dropdown';
import { InputText } from 'primereact/inputtext';
import { Card } from 'primereact/card';
import { Badge } from 'primereact/badge';
import { Toast } from 'primereact/toast';
import { Menu } from 'primereact/menu';
import AddEditSimModal from '../components/add-edit-sim-modal';
import ConfirmActionModal from '../components/confirm-action-modal';

export default function SimCardList() {
    const [simCards, setSimCards] = useState<SimCard[]>([]);
    const [loading, setLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedStatus, setSelectedStatus] = useState<{name: string, code: string} | null>(null);
    const [showAddModal, setShowAddModal] = useState(false);
    const toast = React.useRef<Toast>(null);

    const statusOptions = [
        { name: 'Active', code: 'true' },
        { name: 'Inactive', code: 'false' }
    ];

    const fetchSimCards = async () => {
        setLoading(true);
        try {
            const data = await simCardApi.getSimCards();
            setSimCards(data);
        } catch (error: any) {
            toast.current?.show({
                severity: 'error',
                summary: 'Error',
                detail: error.response?.data?.message || 'Failed to fetch SIM cards'
            });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchSimCards();
    }, []);

    // Filter SIM cards based on search term and selected status
    const filteredSimCards = simCards.filter(sim => {
        const matchesSearch = searchTerm === '' || 
            sim.msisdn.toLowerCase().includes(searchTerm.toLowerCase()) ||
            sim.imsi.toLowerCase().includes(searchTerm.toLowerCase()) ||
            sim.carrier?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            sim.trackingUnit?.imeiNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
            sim.trackingUnit?.serialNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
            sim.trackingUnit?.vehicle?.name.toLowerCase().includes(searchTerm.toLowerCase());

        const matchesStatus = selectedStatus === null || 
            sim.isActive.toString() === selectedStatus.code;

        return matchesSearch && matchesStatus;
    });

    // Status badge template
    const statusBodyTemplate = (sim: SimCard) => {
        return (
            <Badge 
                value={sim.isActive ? 'Active' : 'Inactive'} 
                severity={sim.isActive ? 'success' : 'danger'} 
            />
        );
    };

    const msisdnColumn = (sim: SimCard) => {
        return <span className="font-medium">{sim.msisdn}</span>;
    };

    // Tracking Unit template
    const trackingUnitBodyTemplate = (sim: SimCard) => {
        if (sim.trackingUnit) {
            return (
                <div className="flex flex-col">
                    <span className="font-medium">{sim.trackingUnit.serialNumber}</span>
                    <span className="text-xs text-gray-500">{sim.trackingUnit.imeiNumber}</span>
                </div>
            );
        }
        return <Badge value="Unassigned" severity="warning" />;
    };

    // Vehicle template
    const vehicleBodyTemplate = (sim: SimCard) => {
        if (sim.trackingUnit?.vehicle) {
            return (
                <div className="flex flex-col">
                    <span className="font-medium">{sim.trackingUnit.vehicle.name}</span>
                    <span className="text-xs text-gray-500">{sim.trackingUnit.vehicle.plateNumber}</span>
                </div>
            );
        }
        return '-';
    };

    // Created date template
    const createdAtBodyTemplate = (sim: SimCard) => {
        if (sim.createdAt) {
            const date = new Date(sim.createdAt);
            return new Intl.DateTimeFormat('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric'
            }).format(date);
        }
        return '-';
    };

    const SimMenu = (simCard: SimCard) => {
        const menuRight = useRef(null);
        const [visible, setVisible] = useState(false);
        const [showAssign, setShowAssign] = useState(false);

        const items = [
            {
                label: 'Options',
                items: [
                    {
                        label: 'Edit SIM Card',
                        icon: 'pi pi-pencil',
                        command: () => setVisible(true)
                    },
                    {
                        label: 'Assign to Unit',
                        icon: 'pi pi-link',
                        disabled: !!simCard.trackingUnitId,
                        command: () => setShowAssign(true)
                    },
                    {
                        label: 'Unassign from Unit',
                        icon: 'pi pi-times',
                        disabled: !simCard.trackingUnitId,
                        command: async () => {
                            try {
                                await simCardApi.unassignFromTrackingUnit(simCard.id);
                                toast.current?.show({
                                    severity: 'success',
                                    summary: 'Success',
                                    detail: 'SIM card unassigned successfully'
                                });
                                fetchSimCards();
                            } catch (error) {
                                toast.current?.show({
                                    severity: 'error',
                                    summary: 'Error',
                                    detail: 'Failed to unassign SIM card'
                                });
                            }
                        }
                    },
                    {
                        label: 'Delete',
                        icon: 'pi pi-trash',
                        className: 'text-red-500',
                        command: async () => {
                            if (window.confirm('Are you sure you want to delete this SIM card?')) {
                                try {
                                    await simCardApi.deleteSimCard(simCard.id);
                                    toast.current?.show({
                                        severity: 'success',
                                        summary: 'Success',
                                        detail: 'SIM card deleted successfully'
                                    });
                                    fetchSimCards();
                                } catch (error) {
                                    toast.current?.show({
                                        severity: 'error',
                                        summary: 'Error',
                                        detail: 'Failed to delete SIM card'
                                    });
                                }
                            }
                        }
                    }
                ]
            }
        ];
        return (
            <div className="flex justify-end gap-2">
                <AddEditSimModal simCard={simCard} openModal={visible} setOpenModal={setVisible} onSuccess={fetchSimCards} />
                <AssignSimToUnitModal simCard={simCard} showDialog={showAssign} setShowDialog={setShowAssign} toast={toast} onSuccess={fetchSimCards} />
                <Menu model={items} popup ref={menuRight} id="popup_menu_right" popupAlignment="right" />
                <Button size='small' className="p-button-sm" text icon="pi pi-ellipsis-v" onClick={(event) => menuRight.current.toggle(event)} aria-controls="popup_menu_right" aria-haspopup />
            </div>
        );
    }

    return (
        <div className="p-6 container mx-auto">
            <Toast ref={toast} />
            
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-xl font-bold">SIM Cards</h1>
                
            
                <div className="flex gap-2 items-center">
                    <span className="relative flex items-center">
                        <InputText 
                            placeholder="Search SIM cards..." 
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
                        onClick={fetchSimCards}
                        loading={loading}
                    />
                    <Button 
                        label="Add SIM Card" 
                        icon="pi pi-plus" 
                        className="p-button-sm"
                        onClick={() => setShowAddModal(true)}
                    />
                </div>
            </div>

            <AddEditSimModal openModal={showAddModal} setOpenModal={setShowAddModal} onSuccess={fetchSimCards} />

            <Card className="mb-4 px-0!" pt={{ body: { className: "px-0!" } }}>
            
            <DataTable 
                value={filteredSimCards} 
                loading={loading}
                size='small'
                paginator 
                rows={10}
                tableStyle={{ minWidth: '80rem' }}
                emptyMessage="No SIM cards found"
                rowsPerPageOptions={[5, 10, 25, 50]}
                paginatorTemplate="FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink CurrentPageReport RowsPerPageDropdown"
                currentPageReportTemplate="Showing {first} to {last} of {totalRecords} SIM cards"
            >
                <Column field="msisdn" body={msisdnColumn} header="MSISDN" sortable />
                <Column field="imsi" header="IMSI" sortable />
                <Column field="carrier" header="Carrier" sortable />
                <Column field="trackingUnit" header="Tracking Unit" body={trackingUnitBodyTemplate} />
                <Column field="vehicle" header="Vehicle" body={vehicleBodyTemplate} />
                <Column field="isActive" header="Status" body={statusBodyTemplate} sortable />
                <Column field="createdAt" header="Created" body={createdAtBodyTemplate} sortable />
                <Column header="Actions" align={"right"} body={SimMenu} />
            </DataTable>
            </Card>

        </div>
    );
}

import { AutoComplete, type AutoCompleteChangeEvent, type AutoCompleteCompleteEvent } from "primereact/autocomplete";
import { trackingUnitApi, type TrackingUnit } from '../apis/tracking-unit-api';
import { set, useForm } from 'react-hook-form';

const AssignSimToUnitModal = ({ simCard, showDialog, setShowDialog, toast, onSuccess }:{ simCard: any, showDialog: boolean, setShowDialog: React.Dispatch<React.SetStateAction<boolean>>, toast: React.RefObject<Toast>, onSuccess: () => void }) => {
    const [availableUnits, setAvailableUnits] = useState<TrackingUnit[]|[]>([]);
    const [selectedUnit, setSelectedUnit] = useState<TrackingUnit | null>(null);
    const [loading, setLoading] = useState(false);
    const [filteredUnits, setFilteredUnits] = useState<TrackingUnit[]|[]>([]);

    const { register, setValue, handleSubmit, formState: { errors }, reset } = useForm<{ trackingUnitId: string, simId: string }>({
        defaultValues: {
            trackingUnitId: selectedUnit?.id,
            simId: simCard.id
        }
    });

    const search = (event:AutoCompleteCompleteEvent) => {
        // Timeout to emulate a network connection
        setTimeout(() => {
            let _filteredUnits;

            if (!event.query.trim().length) {
                _filteredUnits = [...availableUnits];
            }
            else {
                _filteredUnits = availableUnits.filter((unit:any) => {
                    return unit.imeiNumber.toLowerCase().startsWith(event.query.toLowerCase()) || 
                           unit.serialNumber.toLowerCase().startsWith(event.query.toLowerCase());
                });
            }

            setFilteredUnits(_filteredUnits);
        }, 250);
    }

    useEffect(() => {
        trackingUnitApi.getTrackingUnits().then((data) => {
            // Filter out units that already have SIM cards assigned
            const unitsWithoutSim = data.filter((unit) => !unit.simCard);
            console.log('Fetched tracking units without SIM cards:', unitsWithoutSim); 
            setAvailableUnits(unitsWithoutSim) 
        });
    }, []);

    const assignSimToUnit = async (data:any) => {
        if (selectedUnit) {
            setLoading(true);
            try {
                // Call API to assign SIM to selected unit
                await simCardApi.assignToTrackingUnit(simCard.id, selectedUnit.id);
                toast.current?.show({
                    severity: 'success',
                    summary: 'Success',
                    detail: `SIM card assigned to ${selectedUnit.serialNumber} successfully`
                });
                // Reset form and close dialog
                reset();
                setSelectedUnit(null);
                setShowDialog(false);
                // Refresh SIM list
                onSuccess();
            } catch (error: any) {
                const errorMessage = error.response?.data?.message 
                    || error.response?.data 
                    || error.message 
                    || 'Failed to assign SIM card';
                toast.current?.show({
                    severity: 'error',
                    summary: 'Error',
                    detail: typeof errorMessage === 'string' ? errorMessage : 'Failed to assign SIM card'
                });
            } finally {
                setLoading(false);
            }
        }
    }


    return (
        <div>
            <ConfirmActionModal action="Assign" showDialog={showDialog} onHide={setShowDialog} onAction={handleSubmit(assignSimToUnit)} title='Assign sim to unit' >
                <div className="flex flex-col justify-content-center w-full">
                    <input type="hidden" {...register('trackingUnitId', { required: true })} value={selectedUnit?.id} />
                    <input type="hidden" {...register('simId', { required: true })} value={simCard.id} />
                    <AutoComplete invalid={!!errors.trackingUnitId} placeholder='Choose IMEI number' field="imeiNumber" value={selectedUnit} suggestions={filteredUnits} completeMethod={search} onChange={(e: AutoCompleteChangeEvent) => { setSelectedUnit(e.value); setValue('trackingUnitId', e.value?.id); }} />
                    <small className="p-error block mt-2">{errors.trackingUnitId && 'Tracking unit is required.'}</small>
                    <small className="p-error block mt-2">{errors.simId && 'SIM is required.'}</small>
                </div>
            </ConfirmActionModal>
        </div>
    );
}