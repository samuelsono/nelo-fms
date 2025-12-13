
import React, { useState, useEffect } from "react";
import { Button } from 'primereact/button';
import { Dialog } from 'primereact/dialog';
import { InputText } from "primereact/inputtext";
import { Dropdown } from "primereact/dropdown";
import { AutoComplete, type AutoCompleteCompleteEvent } from "primereact/autocomplete";
import { Toast } from "primereact/toast";
import { useForm, Controller } from "react-hook-form";
import { vehicleApi } from "../apis/vehicle-api";
import { tenantApi, type Tenant } from "../apis/tenant-api";
import { trackingUnitApi, type TrackingUnit } from "../apis/tracking-unit-api";

interface CreateVehicleModalProps {
    onSuccess?: () => void;
}

export default function CreateVehicleModal({ onSuccess }: CreateVehicleModalProps) {
    const [visible, setVisible] = useState<boolean>(false);
    const [loading, setLoading] = useState(false);
    const [tenants, setTenants] = useState<Tenant[]>([]);
    const [availableUnits, setAvailableUnits] = useState<TrackingUnit[]>([]);
    const [filteredUnits, setFilteredUnits] = useState<TrackingUnit[]>([]);
    const [selectedUnit, setSelectedUnit] = useState<TrackingUnit | null>(null);
    const toast = React.useRef<Toast>(null);

    const statusOptions = [
        { label: 'Active', value: 'active' },
        { label: 'Inactive', value: 'inactive' },
        { label: 'Maintenance', value: 'maintenance' }
    ];

    const { register, handleSubmit, formState: { errors }, reset, control } = useForm({
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
             tenantId: '',
         }
    });

    // Load tenants when modal opens
    useEffect(() => {
        if (visible) {
            loadTenants();
            loadAvailableUnits();
        }
    }, [visible]);

    const loadTenants = async () => {
        try {
            const data = await tenantApi.getTenants();
            setTenants(data);
        } catch (error: any) {
            toast.current?.show({
                severity: 'error',
                summary: 'Error',
                detail: 'Failed to load tenants'
            });
        }
    };

    const loadAvailableUnits = async () => {
        try {
            const units = await trackingUnitApi.getTrackingUnits();
            const availableUnitsFiltered = units.filter((unit: TrackingUnit) => !unit.vehicleId);
            setAvailableUnits(availableUnitsFiltered);
        } catch (error: any) {
            console.error('Failed to load tracking units:', error);
        }
    };

    const searchUnits = (event: AutoCompleteCompleteEvent) => {
        const query = event.query.toLowerCase();
        const filtered = availableUnits.filter((unit) =>
            unit.imeiNumber?.toLowerCase().includes(query) ||
            unit.serialNumber.toLowerCase().includes(query) ||
            unit.model?.toLowerCase().includes(query)
        );
        setFilteredUnits(filtered);
    };

    const onSubmit = async (data: any) => {
        try {
            setLoading(true);
            
            const vehicleData = {
                name: data.name,
                plateNumber: data.plateNumber,
                make: data.make || undefined,
                model: data.model || undefined,
                year: data.year ? parseInt(data.year) : undefined,
                vin: data.vin || undefined,
                color: data.color || undefined,
                status: data.status,
                driver: data.driver || undefined,
                odometer: data.odometer ? parseInt(data.odometer) : undefined,
                tenantId: data.tenantId,
                trackingUnitId: selectedUnit?.id || undefined,
            };

            await vehicleApi.createVehicle(vehicleData);
            
            toast.current?.show({
                severity: 'success',
                summary: 'Success',
                detail: 'Vehicle created successfully'
            });

            setVisible(false);
            reset();
            setSelectedUnit(null);
            
            if (onSuccess) {
                onSuccess();
            }
        } catch (error: any) {
            console.log(error);
            toast.current?.show({
                severity: 'error',
                summary: 'Error',
                detail: error.response?.data?.message || 'Failed to create vehicle'
            });
        } finally {
            setLoading(false);
        }
    };

    const handleDialogHide = () => {
        setVisible(false);
        reset();
        setSelectedUnit(null);
    };

    return (
        <div className="card flex justify-content-center">
            <Toast ref={toast} />
            <Button size="small" label="Add vehicle" icon="pi pi-external-link" onClick={() => setVisible(true)} />
            <Dialog 
                header="Add new vehicle" 
                visible={visible} 
                style={{ width: '50vw' }} 
                onHide={handleDialogHide}
                footer={
                    <div>
                        <Button 
                            label="Cancel" 
                            icon="pi pi-times" 
                            onClick={handleDialogHide} 
                            className="p-button-text" 
                            disabled={loading}
                        />
                        <Button 
                            label="Create vehicle" 
                            icon="pi pi-save" 
                            onClick={handleSubmit(onSubmit)} 
                            loading={loading}
                            autoFocus 
                        />
                    </div>
                }
            >
                <form onSubmit={handleSubmit(onSubmit)}>
                    <div className="grid grid-cols-2 gap-4 mb-4">
                        {/* Tenant Selection - Required */}
                        <div className="flex flex-col">
                            <label className="mb-2 font-bold" htmlFor="tenantId">
                                Tenant <span className="text-red-500">*</span>
                            </label>
                            <Controller
                                name="tenantId"
                                control={control}
                                rules={{ required: "Tenant is required" }}
                                render={({ field }) => (
                                    <Dropdown
                                        id="tenantId"
                                        value={field.value}
                                        onChange={(e) => field.onChange(e.value)}
                                        options={tenants}
                                        optionLabel="name"
                                        optionValue="id"
                                        placeholder="Select a tenant"
                                        className="w-full"
                                        filter
                                    />
                                )}
                            />
                            {errors.tenantId && <span className="text-red-600 text-sm mt-1">{errors.tenantId.message}</span>}
                        </div>

                        {/* Vehicle Name - Required */}
                        <div className="flex flex-col">
                            <label className="mb-2 font-bold" htmlFor="name">
                                Vehicle Name <span className="text-red-500">*</span>
                            </label>
                            <InputText 
                                {...register("name", { required: "Vehicle name is required" })} 
                                type="text" 
                                className="p-inputtext-sm" 
                                placeholder="Enter vehicle name" 
                            />
                            {errors.name && <span className="text-red-600 text-sm mt-1">{errors.name.message}</span>}
                        </div>

                        {/* Plate Number - Required */}
                        <div className="flex flex-col">
                            <label className="mb-2 font-bold" htmlFor="plateNumber">
                                Plate Number <span className="text-red-500">*</span>
                            </label>
                            <InputText 
                                {...register("plateNumber", { required: "Plate number is required" })} 
                                type="text" 
                                className="p-inputtext-sm" 
                                placeholder="Enter plate number" 
                            />
                            {errors.plateNumber && <span className="text-red-600 text-sm mt-1">{errors.plateNumber.message}</span>}
                        </div>

                        {/* Status */}
                        <div className="flex flex-col">
                            <label className="mb-2 font-bold" htmlFor="status">Status</label>
                            <Controller
                                name="status"
                                control={control}
                                render={({ field }) => (
                                    <Dropdown
                                        id="status"
                                        value={field.value}
                                        onChange={(e) => field.onChange(e.value)}
                                        options={statusOptions}
                                        placeholder="Select status"
                                        className="w-full"
                                    />
                                )}
                            />
                        </div>

                        {/* Make */}
                        <div className="flex flex-col">
                            <label className="mb-2 font-bold" htmlFor="make">Make</label>
                            <InputText 
                                {...register("make")} 
                                type="text" 
                                className="p-inputtext-sm" 
                                placeholder="e.g., Toyota, Ford" 
                            />
                        </div>

                        {/* Model */}
                        <div className="flex flex-col">
                            <label className="mb-2 font-bold" htmlFor="model">Model</label>
                            <InputText 
                                {...register("model")} 
                                type="text" 
                                className="p-inputtext-sm" 
                                placeholder="e.g., Camry, F-150" 
                            />
                        </div>

                        {/* Year */}
                        <div className="flex flex-col">
                            <label className="mb-2 font-bold" htmlFor="year">Year</label>
                            <InputText 
                                {...register("year")} 
                                type="number" 
                                className="p-inputtext-sm" 
                                placeholder="e.g., 2024" 
                            />
                        </div>

                        {/* Color */}
                        <div className="flex flex-col">
                            <label className="mb-2 font-bold" htmlFor="color">Color</label>
                            <InputText 
                                {...register("color")} 
                                type="text" 
                                className="p-inputtext-sm" 
                                placeholder="e.g., White, Black" 
                            />
                        </div>

                        {/* VIN Number */}
                        <div className="flex flex-col col-span-2">
                            <label className="mb-2 font-bold" htmlFor="vin">VIN Number</label>
                            <InputText 
                                {...register("vin")} 
                                type="text" 
                                className="p-inputtext-sm" 
                                placeholder="Enter vehicle identification number" 
                            />
                        </div>

                        {/* Driver */}
                        <div className="flex flex-col">
                            <label className="mb-2 font-bold" htmlFor="driver">Driver</label>
                            <InputText 
                                {...register("driver")} 
                                type="text" 
                                className="p-inputtext-sm" 
                                placeholder="Enter driver name" 
                            />
                        </div>

                        {/* Odometer */}
                        <div className="flex flex-col">
                            <label className="mb-2 font-bold" htmlFor="odometer">Odometer (km)</label>
                            <InputText 
                                {...register("odometer")} 
                                type="number" 
                                className="p-inputtext-sm" 
                                placeholder="Enter odometer reading" 
                            />
                        </div>

                        {/* Tracking Unit */}
                        <div className="flex flex-col col-span-2">
                            <label className="mb-2 font-bold" htmlFor="trackingUnit">Tracking Unit</label>
                            <AutoComplete
                                value={selectedUnit || undefined}
                                suggestions={filteredUnits}
                                completeMethod={searchUnits}
                                field="imeiNumber"
                                onChange={(e) => setSelectedUnit(e.value)}
                                placeholder="Search by IMEI, Serial Number, or Model"
                                className="w-full"
                                itemTemplate={(unit: TrackingUnit) => (
                                    <div className="p-2">
                                        <div className="font-bold">{unit.imeiNumber || unit.serialNumber}</div>
                                        <div className="text-sm text-gray-600">
                                            {unit.model && `${unit.model} - `}
                                            {unit.manufacturer}
                                        </div>
                                    </div>
                                )}
                                emptyMessage="No available tracking units found"
                            />
                            <small className="text-gray-600 mt-1">
                                Optional: Assign a tracking unit to this vehicle
                            </small>
                        </div>
                    </div>
                </form>
            </Dialog>
        </div>
    )
}
        