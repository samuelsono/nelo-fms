
import React, { useState } from "react";
import { Button } from 'primereact/button';
import { Dialog } from 'primereact/dialog';
import { InputText } from "primereact/inputtext";
import { Dropdown } from 'primereact/dropdown';
import { useForm, Controller } from "react-hook-form";
import { trackingUnitApi } from '../apis/tracking-unit-api';
import { Toast } from 'primereact/toast';

interface AddUnitModalProps {
    onUnitAdded?: () => void;
}

export default function AddUnitModal({ onUnitAdded }: AddUnitModalProps) {
    const [visible, setVisible] = useState<boolean>(false);
    const [loading, setLoading] = useState<boolean>(false);
    const toast = React.useRef<Toast>(null);
    
    const { register, handleSubmit, formState: { errors }, reset, control } = useForm({
         defaultValues: {
             imeiNumber: '',
             serialNumber: '',
             model: '',
             manufacturer: '',
             firmwareVersion: '',
             isActive: true,
         }
      })  
      
    const statusOptions = [
        { label: 'Active', value: true },
        { label: 'Inactive', value: false }
    ];

    const onSubmit = async (data: any) => {
        setLoading(true);
        try {
            await trackingUnitApi.createTrackingUnit(data);
            toast.current?.show({
                severity: 'success',
                summary: 'Success',
                detail: 'Tracking unit created successfully'
            });
            reset();
            setVisible(false);
            if (onUnitAdded) {
                onUnitAdded();
            }
        } catch (error: any) {
            toast.current?.show({
                severity: 'error',
                summary: 'Error',
                detail: error.response?.data || 'Failed to create tracking unit'
            });
        } finally {
            setLoading(false);
        }
    };
      
    const footerContent = (
        <div>
            <Button label="Cancel" icon="pi pi-times" onClick={() => setVisible(false)} className="p-button-text" disabled={loading} />
            <Button label="Create Unit" icon="pi pi-save" onClick={handleSubmit(onSubmit)} loading={loading} autoFocus />
        </div>
    );

    return (
        <div className="card flex justify-content-center">
            <Toast ref={toast} />
            <Button size="small" label="Add unit" icon="pi pi-plus" onClick={() => setVisible(true)} />
            <Dialog header="Add New Tracking Unit" visible={visible} style={{ width: '50vw' }} onHide={() => {if (!visible) return; setVisible(false); reset(); }} footer={footerContent}>
                <form onSubmit={handleSubmit(onSubmit)}>
                    <div className="grid grid-cols-2 gap-4 mb-4">
                        <div className="flex flex-col">
                            <label className="mb-2 font-bold" htmlFor="imeiNumber">IMEI Number *</label>
                            <InputText 
                                {...register("imeiNumber", { required: "IMEI number is required" })} 
                                type="text" 
                                className="p-inputtext-sm" 
                                placeholder="Enter IMEI number" 
                            />
                            {errors.imeiNumber && <span className="text-red-600 text-sm mt-1">{errors.imeiNumber.message}</span>}
                        </div>
                        <div className="flex flex-col">
                            <label className="mb-2 font-bold" htmlFor="serialNumber">Serial Number *</label>
                            <InputText 
                                {...register("serialNumber", { required: "Serial number is required" })} 
                                type="text" 
                                className="p-inputtext-sm" 
                                placeholder="Enter serial number" 
                            />
                            {errors.serialNumber && <span className="text-red-600 text-sm mt-1">{errors.serialNumber.message}</span>}
                        </div>
                        <div className="flex flex-col">
                            <label className="mb-2 font-bold" htmlFor="model">Model</label>
                            <InputText 
                                {...register("model")} 
                                type="text" 
                                className="p-inputtext-sm" 
                                placeholder="Enter device model" 
                            />
                        </div>
                        <div className="flex flex-col">
                            <label className="mb-2 font-bold" htmlFor="manufacturer">Manufacturer</label>
                            <InputText 
                                {...register("manufacturer")} 
                                type="text" 
                                className="p-inputtext-sm" 
                                placeholder="Enter manufacturer" 
                            />
                        </div>
                        <div className="flex flex-col">
                            <label className="mb-2 font-bold" htmlFor="firmwareVersion">Firmware Version</label>
                            <InputText 
                                {...register("firmwareVersion")} 
                                type="text" 
                                className="p-inputtext-sm" 
                                placeholder="Enter firmware version" 
                            />
                        </div>
                        <div className="flex flex-col">
                            <label className="mb-2 font-bold" htmlFor="isActive">Status</label>
                            <Controller
                                name="isActive"
                                control={control}
                                render={({ field }) => (
                                    <Dropdown
                                        id="isActive"
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
                </form>
            </Dialog>
        </div>
    )
}
        