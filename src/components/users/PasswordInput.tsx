import { translate, useLanguage } from "../../i18n";
import {
  Eye,
  EyeOff
} from "lucide-react";
import { useState } from "react";

export function PasswordInput({
  name,
  label,
  autoComplete,
  required = true,
  minLength,
}: {
  name: string;
  label: string;
  autoComplete: string;
  required?: boolean;
  minLength?: number;
}) {
  useLanguage();
  const [visible, setVisible] = useState(false);
  return (
    <label>
      {label}
      <span className="password-field">
        <input
          name={name}
          type={visible ? "text" : "password"}
          autoComplete={autoComplete}
          minLength={minLength}
          maxLength={128}
          required={required}
        />
        <button
          type="button"
          className="icon-button"
          aria-label={
            visible
              ? translate("Hide {{label}}", { label: label.toLowerCase() })
              : translate("Show {{label}}", { label: label.toLowerCase() })
          }
          onClick={() => setVisible(!visible)}
        >
          {visible ? <EyeOff size={16} /> : <Eye size={16} />}
        </button>
      </span>
    </label>
  );
}
