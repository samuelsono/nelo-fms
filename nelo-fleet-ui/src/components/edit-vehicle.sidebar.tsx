
import React, { useState, useEffect } from 'react';
import { Sidebar } from 'primereact/sidebar';
import { Button } from 'primereact/button';
import { useForm, Controller } from 'react-hook-form';
import { InputText } from 'primereact/inputtext';
import { Dropdown } from 'primereact/dropdown';
import { AutoComplete, type AutoCompleteCompleteEvent, type AutoCompleteChangeEvent } from 'primereact/autocomplete';
import { Toast } from 'primereact/toast';
import { vehicleApi, type Vehicle } from '../apis/vehicle-api';
import { trackingUnitApi, type TrackingUnit } from '../apis/tracking-unit-api';

interface EditVehicleSidebarProps {
    vehicleId: string;
    visible?: boolean;
    onHide?: () => void;
    onSuccess?: () => void;
}

export default function EditVehicleSidebar({ vehicleId, visible: externalVisible, onHide, onSuccess }: EditVehicleSidebarProps) {
    const [internalVisible, setInternalVisible] = useState<boolean>(false);
    const [vehicle, setVehicle] = useState<Vehicle | null>(null);
    const [loading, setLoading] = useState(false);
    const [availableUnits, setAvailableUnits] = useState<TrackingUnit[]>([]);
    const [filteredUnits, setFilteredUnits] = useState<TrackingUnit[]>([]);
    const [selectedUnit, setSelectedUnit] = useState<TrackingUnit | null>(null);
    const toast = React.useRef<Toast>(null);

    const visible = externalVisible !== undefined ? externalVisible : internalVisible;
    const setVisible = onHide ? (val: boolean) => !val && onHide() : setInternalVisible;

    const statusOptions = [
        { label: 'Active', value: 'active' },
        { label: 'Inactive', value: 'inactive' },
        { label: 'Maintenance', value: 'maintenance' }
    ];

    const { register, handleSubmit, formState: { errors }, reset, control, setValue } = useForm({
         defaultValues: {
             name: '',
             plateNumber: '',
             make: '',
             vin: '',
             model: '',
             year: '',
             color: '',
             status: 'active',
             driver: '',
             odometer: '',
         }
    })

    const loadVehicleDetails = async (id: string) => {
        try {
            setLoading(true);
            const data = await vehicleApi.getVehicle(id);
            setVehicle(data);
            reset({
                name: data.name,
                plateNumber: data.plateNumber,
                make: data.make || '',
                vin: data.vin || '',
                model: data.model || '',
                year: data.year?.toString() || '',
                color: data.color || '',
                status: data.status,
                driver: data.driver || '',
                odometer: data.odometer?.toString() || '',
            });
            
            // Set current tracking unit if exists
            if (data.trackingUnit) {
                setSelectedUnit(data.trackingUnit as any);
            }
        } catch (error: any) {
            toast.current?.show({
                severity: 'error',
                summary: 'Error',
                detail: error.response?.data?.message || 'Failed to load vehicle details'
            });
        } finally {
            setLoading(false);
        }
    };

    const loadAvailableUnits = async () => {
        try {
            const data = await trackingUnitApi.getTrackingUnits();
            // Filter out units that already have vehicles (except the current one)
            const unassignedUnits = data.filter(unit => 
                !unit.vehicleId || unit.vehicleId === vehicleId
            );
            setAvailableUnits(unassignedUnits);
        } catch (error) {
            console.error('Failed to load tracking units:', error);
        }
    };

    const searchUnits = (event: AutoCompleteCompleteEvent) => {
        setTimeout(() => {
            let _filteredUnits;
            if (!event.query.trim().length) {
                _filteredUnits = [...availableUnits];
            } else {
                _filteredUnits = availableUnits.filter((unit: any) => {
                    return unit.imeiNumber.toLowerCase().includes(event.query.toLowerCase()) ||
                           unit.serialNumber.toLowerCase().includes(event.query.toLowerCase());
                });
            }
            setFilteredUnits(_filteredUnits);
        }, 250);
    };

    const handleAssignUnit = async () => {
        if (!selectedUnit || !vehicle) return;
        
        try {
            setLoading(true);
            await trackingUnitApi.assignToVehicle(selectedUnit.id, vehicleId);
            toast.current?.show({
                severity: 'success',
                summary: 'Success',
                detail: 'Tracking unit assigned successfully'
            });
            await loadVehicleDetails(vehicleId);
        } catch (error: any) {
            toast.current?.show({
                severity: 'error',
                summary: 'Error',
                detail: error.response?.data?.message || 'Failed to assign tracking unit'
            });
        } finally {
            setLoading(false);
        }
    };

    const handleUnassignUnit = async () => {
        if (!vehicle?.trackingUnit) return;
        
        try {
            setLoading(true);
            await trackingUnitApi.unassignFromVehicle(vehicle.trackingUnit.id);
            toast.current?.show({
                severity: 'success',
                summary: 'Success',
                detail: 'Tracking unit unassigned successfully'
            });
            setSelectedUnit(null);
            await loadVehicleDetails(vehicleId);
        } catch (error: any) {
            toast.current?.show({
                severity: 'error',
                summary: 'Error',
                detail: error.response?.data?.message || 'Failed to unassign tracking unit'
            });
        } finally {
            setLoading(false);
        }
    };

    const onSubmit = async (data: any) => {
        if (!vehicle) return;
        
        try {
            setLoading(true);
            await vehicleApi.updateVehicle(vehicleId, {
                id: vehicleId,
                tenantId: vehicle.tenantId,
                ...data,
                year: data.year ? parseInt(data.year) : undefined,
                odometer: data.odometer ? parseInt(data.odometer) : undefined,
                trackingUnitId: selectedUnit?.id || null
            });
            toast.current?.show({
                severity: 'success',
                summary: 'Success',
                detail: 'Vehicle updated successfully'
            });
            if (onSuccess) {
                onSuccess();
            }
        } catch (error: any) {
            toast.current?.show({
                severity: 'error',
                summary: 'Error',
                detail: error.response?.data?.message || 'Failed to update vehicle'
            });
            console.error('Update vehicle error:', error);
        } finally {
            setLoading(false);
        }
    };

    const vehicleHeader = () => {
        return (
            <div className='flex flex-col px-5'>
                <h3 className='text-xl font-bold m-0'>Registration: {vehicle?.plateNumber || "N/A"}</h3>
                <p className='text-lg'>Name: {vehicle?.name || "Edit vehicle"}</p>
            </div>
        )
    }

    useEffect(() => {
        if (visible && vehicleId) {
            loadVehicleDetails(vehicleId);
            loadAvailableUnits();
        }
    }, [visible, vehicleId]);

    const handleClose = () => {
        setVisible(false);
        reset();
        setVehicle(null);
        setSelectedUnit(null);
        if (onSuccess) {
            onSuccess();
        }
    };

    return (
        <div className="card flex justify-content-center">
            <Toast ref={toast} />
            <Sidebar header={vehicleHeader} className='w-full md:w-1/2!' visible={visible} onHide={handleClose} position='right'>
                {loading && !vehicle ? (
                    <div className="flex items-center justify-center p-8">
                        <i className="pi pi-spin pi-spinner text-4xl"></i>
                    </div>
                ) : (
                    <form className='mx-auto max-w-2xl py-5' onSubmit={handleSubmit(onSubmit)}>
                        <div className="grid grid-cols-2 gap-4 mb-6">
                            <div className="flex flex-col">
                                <label className="mb-2 font-bold" htmlFor="name">Vehicle Name *</label>
                                <InputText 
                                    {...register("name", { required: "Vehicle name is required" })} 
                                    type="text" 
                                    className="p-inputtext-sm" 
                                    placeholder="Enter vehicle name" 
                                />
                                {errors.name && <span className="text-red-600 text-sm mt-1">{errors.name.message}</span>}
                            </div>
                            <div className="flex flex-col">
                                <label className="mb-2 font-bold" htmlFor="plateNumber">Plate Number *</label>
                                <InputText 
                                    {...register("plateNumber", { required: "Plate number is required" })} 
                                    type="text" 
                                    className="p-inputtext-sm" 
                                    placeholder="Enter plate number" 
                                />
                                {errors.plateNumber && <span className="text-red-600 text-sm mt-1">{errors.plateNumber.message}</span>}
                            </div>
                            <div className="flex flex-col">
                                <label className="mb-2 font-bold" htmlFor="make">Make</label>
                                <InputText 
                                    {...register("make")} 
                                    type="text" 
                                    className="p-inputtext-sm" 
                                    placeholder="e.g., Toyota, Ford" 
                                />
                            </div>
                            <div className="flex flex-col">
                                <label className="mb-2 font-bold" htmlFor="model">Model</label>
                                <InputText 
                                    {...register("model")} 
                                    type="text" 
                                    className="p-inputtext-sm" 
                                    placeholder="e.g., Camry, F-150" 
                                />
                            </div>
                            <div className="flex flex-col">
                                <label className="mb-2 font-bold" htmlFor="year">Year</label>
                                <InputText 
                                    {...register("year")} 
                                    type="number" 
                                    className="p-inputtext-sm" 
                                    placeholder="e.g., 2023" 
                                />
                            </div>
                            <div className="flex flex-col">
                                <label className="mb-2 font-bold" htmlFor="color">Color</label>
                                <InputText 
                                    {...register("color")} 
                                    type="text" 
                                    className="p-inputtext-sm" 
                                    placeholder="Enter vehicle color" 
                                />
                            </div>
                            <div className="flex flex-col">
                                <label className="mb-2 font-bold" htmlFor="odometer">Odometer (km)</label>
                                <InputText 
                                    {...register("odometer")} 
                                    type="number" 
                                    className="p-inputtext-sm" 
                                    placeholder="Enter current odometer reading" 
                                />
                            </div>
                            <div className="flex flex-col col-span-2">
                                <label className="mb-2 font-bold" htmlFor="vin">VIN Number</label>
                                <InputText 
                                    {...register("vin")} 
                                    type="text" 
                                    className="p-inputtext-sm" 
                                    placeholder="Enter vehicle VIN number" 
                                />
                            </div>
                            <div className="flex flex-col">
                                <label className="mb-2 font-bold" htmlFor="driver">Driver</label>
                                <InputText 
                                    {...register("driver")} 
                                    type="text" 
                                    className="p-inputtext-sm" 
                                    placeholder="Enter driver name" 
                                />
                            </div>
                            <div className="flex flex-col">
                                <label className="mb-2 font-bold" htmlFor="status">Status</label>
                                <Controller
                                    name="status"
                                    control={control}
                                    render={({ field }) => (
                                        <Dropdown
                                            id="status"
                                            value={field.value}
                                            options={statusOptions}
                                            onChange={(e) => field.onChange(e.value)}
                                            placeholder="Select status"
                                            className="p-inputtext-sm"
                                        />
                                    )}
                                />
                            </div>
                        </div>

                        {/* Tracking Unit Assignment Section */}
                        <div className="border-t pt-4 mb-6">
                            <h3 className="font-bold text-lg mb-3">Tracking Unit Assignment</h3>
                            {vehicle?.trackingUnit ? (
                                <div className="bg-blue-50 border border-blue-200 p-4 rounded mb-3">
                                    <div className="flex justify-between items-start mb-3">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2 mb-2">
                                                <i className="pi pi-microchip text-blue-600"></i>
                                                <h4 className="font-bold text-lg">Assigned Tracking Unit</h4>
                                            </div>
                                        </div>
                                        <Button 
                                            label="Unassign" 
                                            icon="pi pi-times" 
                                            className="p-button-sm p-button-danger"
                                            onClick={handleUnassignUnit}
                                            loading={loading}
                                            type="button"
                                        />
                                    </div>
                                    
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <p className="text-xs text-gray-600 mb-1">Serial Number</p>
                                            <p className="font-medium">{vehicle.trackingUnit.serialNumber}</p>
                                        </div>
                                        <div>
                                            <p className="text-xs text-gray-600 mb-1">IMEI Number</p>
                                            <p className="font-medium">{vehicle.trackingUnit.imeiNumber || 'N/A'}</p>
                                        </div>
                                        {vehicle.trackingUnit.model && (
                                            <div>
                                                <p className="text-xs text-gray-600 mb-1">Model</p>
                                                <p className="font-medium">{vehicle.trackingUnit.model}</p>
                                            </div>
                                        )}
                                        {vehicle.trackingUnit.manufacturer && (
                                            <div>
                                                <p className="text-xs text-gray-600 mb-1">Manufacturer</p>
                                                <p className="font-medium">{vehicle.trackingUnit.manufacturer}</p>
                                            </div>
                                        )}
                                        {vehicle.trackingUnit.firmwareVersion && (
                                            <div>
                                                <p className="text-xs text-gray-600 mb-1">Firmware Version</p>
                                                <p className="font-medium">{vehicle.trackingUnit.firmwareVersion}</p>
                                            </div>
                                        )}
                                        {vehicle.trackingUnit.simCard && (
                                            <div>
                                                <p className="text-xs text-gray-600 mb-1">SIM Card</p>
                                                <p className="font-medium">{vehicle.trackingUnit.simCard.msisdn}</p>
                                                {vehicle.trackingUnit.simCard.carrier && (
                                                    <p className="text-xs text-gray-500">{vehicle.trackingUnit.simCard.carrier}</p>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ) : (
                                <div className="flex flex-col gap-2">
                                    <label className="mb-2 font-bold">Assign Tracking Unit</label>
                                    <div className="flex gap-2">
                                        <AutoComplete
                                            value={selectedUnit}
                                            suggestions={filteredUnits}
                                            completeMethod={searchUnits}
                                            field="serialNumber"
                                            placeholder="Search by Serial or IMEI"
                                            onChange={(e: AutoCompleteChangeEvent) => setSelectedUnit(e.value)}
                                            className="flex-1"
                                            itemTemplate={(item) => (
                                                <div>
                                                    <div className="font-medium">{item.serialNumber}</div>
                                                    <div className="text-sm text-gray-600">IMEI: {item.imeiNumber}</div>
                                                </div>
                                            )}
                                        />
                                        <Button 
                                            label="Assign" 
                                            icon="pi pi-check" 
                                            className="p-button-sm"
                                            onClick={handleAssignUnit}
                                            disabled={!selectedUnit}
                                            loading={loading}
                                            type="button"
                                        />
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="flex gap-2 justify-end">
                            <Button 
                                label="Cancel" 
                                icon="pi pi-times" 
                                className="p-button-text p-button-sm" 
                                onClick={handleClose}
                                type="button"
                            />
                            <Button 
                                label="Save Changes" 
                                icon="pi pi-check" 
                                className="p-button-sm" 
                                type="submit"
                                loading={loading}
                            />
                        </div>
                    </form>
                )}
            </Sidebar>
            {!externalVisible && (
                <Button size='small' text icon="pi pi-pencil" onClick={() => setInternalVisible(true)} />
            )}
        </div>
    )
}
        