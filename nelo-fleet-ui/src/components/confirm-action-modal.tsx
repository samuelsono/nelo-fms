
import React, { useEffect, useState } from "react";
import { Button } from 'primereact/button';
import { Dialog } from 'primereact/dialog';

export default function ConfirmActionModal({ children, showDialog, action,  title,  onHide, onAction, onCancel }: { children: React.ReactNode, action?: string, title?: string, showDialog: boolean, onHide: (val:any) => void, onAction?: () => void, onCancel?: () => void }) {
    const [visible, setVisible] = useState<boolean>(false);

    const headerElement = (
        <div className="inline-flex align-items-center justify-content-center gap-2">
            <span className="font-bold white-space-nowrap">{title || "Confirm Action"}</span>
        </div>
    );

    const footerContent = (
        <div>
            <Button text label="Cancel" icon="pi pi-times" onClick={() => { setVisible(false); onCancel && onCancel(); onHide(false); }} />
            <Button label={action || "Accept"} icon="pi pi-check" onClick={() => {  onAction && onAction(); }} autoFocus />
        </div>
    );

    useEffect(() => {
        setVisible(showDialog);
    }, [showDialog]);

    return (
        <div className="card flex justify-content-center">
            <Dialog visible={visible} modal header={headerElement} footer={footerContent} style={{ width: '50rem' }} onHide={() => {if (!visible) return; setVisible(false); onHide(false) }}>
                {children}
            </Dialog>
        </div>
    )
}
        