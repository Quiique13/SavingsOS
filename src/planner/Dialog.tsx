import { useEffect, useRef, type ReactNode } from "react";
import { X } from "lucide-react";
export function Dialog({ title, children, onClose, canClose = true }: {
    title: string;
    children: ReactNode;
    onClose: () => void;
    canClose?: boolean;
}) {
    const ref = useRef<HTMLDialogElement>(null);
    useEffect(() => { const d = ref.current!; d.showModal(); return () => d.close(); }, []);
    return <dialog aria-label={title} ref={ref} className="planner-dialog" onCancel={event => { if (!canClose)
        event.preventDefault();
    else
        onClose(); }} onClick={e => {
            if (canClose && e.target === e.currentTarget)
                onClose();
        }}><div className="dialog-head"><div><span className="eyebrow">A LITTLE MORE ORGANIZED</span><h2>{title}</h2></div><button className="icon-button" onClick={onClose} disabled={!canClose} aria-label="Close dialog"><X size={20}/></button></div>{children}</dialog>;
}
