
import React, { useEffect, useState } from "react";
import { Button } from 'primereact/button';
import { Dialog } from 'primereact/dialog';
import { InputText } from "primereact/inputtext";
import { Dropdown } from 'primereact/dropdown';
import { useForm, Controller } from "react-hook-form";
import { Toast } from 'primereact/toast';
import apiClient from '../apis/api';

export interface SimCard {
    id?: string;
    msisdn: string;
    imsi: string;
    puk: string;
    carrier?: string;
    isActive: boolean;
    trackingUnitId?: string;
}

interface AddEditSimModalProps {
    simCard?: SimCard | null;
    openModal: boolean;
    setOpenModal: (open: boolean) => void;
    onSuccess?: () => void;
}

export default function AddEditSimModal({ simCard, onSuccess, openModal, setOpenModal }: AddEditSimModalProps) {
    const [visible, setVisible] = useState<boolean>(false);
    const [loading, setLoading] = useState<boolean>(false);
    const toast = React.useRef<Toast>(null);
    const isEditMode = !!simCard?.id;
    
    const { register, handleSubmit, formState: { errors }, reset, control } = useForm({
         defaultValues: {
             msisdn: '',
             imsi: '',
             puk: '',
             carrier: '',
             isActive: true,
             trackingUnitId: '',
         }
      })  
      
    const statusOptions = [
        { label: 'Active', value: true },
        { label: 'Inactive', value: false }
    ];

    const onSubmit = async (data: any) => {
        setLoading(true);
        try {
            if (isEditMode && simCard?.id) {
                // Update existing SIM card
                const updateData = { ...data, id: simCard.id };
                await apiClient.put(`/sims/${simCard.id}`, updateData);
                toast.current?.show({
                    severity: 'success',
                    summary: 'Success',
                    detail: 'SIM card updated successfully'
                });
            } else {
                // Create new SIM card
                await apiClient.post('/sims', data);
                toast.current?.show({
                    severity: 'success',
                    summary: 'Success',
                    detail: 'SIM card created successfully'
                });
            }
            reset();
            setVisible(false);
            if (onSuccess) {
                onSuccess();
            }
        } catch (error: any) {
            const errorMessage = error.response?.data?.title 
                || error.response?.data?.message 
                || error.response?.data
                || error.message 
                || `Failed to ${isEditMode ? 'update' : 'create'} SIM card`;
            toast.current?.show({
                severity: 'error',
                summary: 'Error',
                detail: typeof errorMessage === 'string' ? errorMessage : 'An error occurred'
            });
        } finally {
            setLoading(false);
        }
    };
      
    const footerContent = (
        <div>
            <Button label="Cancel" icon="pi pi-times" onClick={() => setVisible(false)} className="p-button-text" disabled={loading} />
            <Button label={isEditMode ? "Update SIM Card" : "Create SIM Card"} onClick={handleSubmit(onSubmit)} loading={loading} autoFocus />
        </div>
    );

    useEffect(() => {
        if (openModal) {
            setVisible(true);
            if (simCard) {
                // Populate form with simCard data for edit mode
                reset({
                    msisdn: simCard.msisdn || '',
                    imsi: simCard.imsi || '',
                    puk: simCard.puk || '',
                    carrier: simCard.carrier || '',
                    isActive: simCard.isActive ?? true,
                    trackingUnitId: simCard.trackingUnitId || '',
                });
            } else {
                // Reset to defaults for add mode
                reset({
                    msisdn: '',
                    imsi: '',
                    puk: '',
                    carrier: '',
                    isActive: true,
                    trackingUnitId: '',
                });
            }
        }
    }, [openModal, simCard, reset]);

    return (
        <div className="card flex justify-content-center">
            <Toast ref={toast} />
            <Dialog 
                header={isEditMode ? "Edit SIM Card" : "Add SIM Card"} 
                visible={visible} 
                style={{ width: '50vw' }} 
                onHide={() => {
                    if (!visible) return; 
                    setVisible(false); 
                    reset(); 
                    setOpenModal(false);
                }} 
                footer={footerContent}
            >
                <form onSubmit={handleSubmit(onSubmit)}>
                    <div className="grid grid-cols-2 gap-4 mb-4">
                        <div className="flex flex-col">
                            <label className="mb-2 font-bold" htmlFor="msisdn">MSISDN (Phone Number) *</label>
                            <InputText 
                                {...register("msisdn", { required: "MSISDN is required" })} 
                                type="text" 
                                className="p-inputtext-sm" 
                                placeholder="e.g., +27821234567" 
                            />
                            {errors.msisdn && <span className="text-red-600 text-sm mt-1">{errors.msisdn.message}</span>}
                        </div>
                        <div className="flex flex-col">
                            <label className="mb-2 font-bold" htmlFor="imsi">IMSI *</label>
                            <InputText 
                                {...register("imsi", { required: "IMSI is required" })} 
                                type="text" 
                                className="p-inputtext-sm" 
                                placeholder="Enter IMSI" 
                            />
                            {errors.imsi && <span className="text-red-600 text-sm mt-1">{errors.imsi.message}</span>}
                        </div>
                        <div className="flex flex-col">
                            <label className="mb-2 font-bold" htmlFor="puk">PUK *</label>
                            <InputText 
                                {...register("puk", { required: "PUK is required" })} 
                                type="text" 
                                className="p-inputtext-sm" 
                                placeholder="Enter PUK code" 
                            />
                            {errors.puk && <span className="text-red-600 text-sm mt-1">{errors.puk.message}</span>}
                        </div>
                        <div className="flex flex-col">
                            <label className="mb-2 font-bold" htmlFor="carrier">Carrier</label>
                            <InputText 
                                {...register("carrier")} 
                                type="text" 
                                className="p-inputtext-sm" 
                                placeholder="e.g., Vodacom, MTN" 
                            />
                        </div>
                        <div className="flex flex-col">
                            <label className="mb-2 font-bold" htmlFor="trackingUnitId">Tracking Unit ID</label>
                            <InputText 
                                {...register("trackingUnitId")} 
                                type="text" 
                                className="p-inputtext-sm" 
                                placeholder="Optional tracking unit ID" 
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
        