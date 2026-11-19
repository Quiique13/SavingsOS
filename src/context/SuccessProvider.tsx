import { useEffect, useRef, useState, type ReactNode } from "react";
import { X } from "lucide-react";
import { translate, useLanguage } from "../i18n";
import { SuccessContext } from "./SuccessContext";
import { SuccessCheck } from "../components/common/SuccessCheck";

export function SuccessProvider({ children }: { children: ReactNode }) {
  useLanguage();
  const nextId = useRef(0);
  const [notice, setNotice] = useState<{ id: number; message: string } | null>(null);
  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(null), 4500);
    return () => window.clearTimeout(timer);
  }, [notice]);
  return (
    <SuccessContext.Provider value={message => setNotice({ id: ++nextId.current, message })}>
      {children}
      {notice && (
        <div className="success-notice" key={notice.id}>
          <span className="success-notice-icon"><SuccessCheck /></span>
          <span role="status">{translate(notice.message)}</span>
          <button type="button" className="icon-button" aria-label={translate("Dismiss notification")} onClick={() => setNotice(null)}><X size={16} /></button>
        </div>
      )}
    </SuccessContext.Provider>
  );
}
