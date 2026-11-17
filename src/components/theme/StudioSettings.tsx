import {
  ArrowDownToLine,
  CircleHelp,
  LockKeyhole,
  ShieldCheck,
  Trash2,
  Upload,
} from "lucide-react";
import { translate } from "../../i18n";
import { browserStorage } from "../../services/runtime";
import { PageHeading } from "../common/PageHeading";
import { InstallApp } from "../common/InstallApp";
import { AppearanceSettings } from "./ThemeControls";
import { LanguageSettings } from "./LanguageSettings";
import { CurrencySettings } from "./CurrencySettings";
import { useCurrency } from "../../utils/currency";
import { useDemo } from "../../context/DemoContext";

type Props = {
  online: boolean;
  busy: boolean;
  message: string;
  hasSamples: boolean;
  onBackup: () => void;
  onRestore: () => void;
  onPortable: () => void;
  onProfile: () => void;
  onClearSamples: () => void;
};

export function StudioSettings(props: Props) {
  const { currency } = useCurrency();
  const demoMode = useDemo();
  return (
    <section className="settings-page studio-settings-page">
      <PageHeading
        title="Settings"
        designTitle="Make it yours."
        eyebrow="PREFERENCES / SYSTEM"
        description="Manage your appearance, profile, and backups."
      >
        <button className="button secondary" onClick={props.onProfile}>
          <LockKeyhole size={16} />
          {translate("Profile & security")}
        </button>
      </PageHeading>
      {props.message && (
        <p className="status-message" role="status">
          {translate(props.message)}
        </p>
      )}
      <div className="studio-settings-grid">
        <section className="panel studio-preferences">
          <AppearanceSettings />
          <LanguageSettings />
          <CurrencySettings />
        </section>
        <section className="panel studio-data-settings">
          <div className="panel-heading">
            <div>
              <h2>{translate("Your data")}</h2>
              <p>{translate("Transparent storage and portable backups")}</p>
            </div>
          </div>
          <div className="studio-settings-row">
            <div>
              <h3>{translate("Export finance backup")}</h3>
              <p>
                {translate(
                  "Unencrypted export of the current planner. Store it securely.",
                )}
              </p>
            </div>
            <button className="button secondary" onClick={props.onBackup}>
              <ArrowDownToLine size={15} />
              {translate("Export")}
            </button>
          </div>
          <div className="studio-settings-row">
            <div>
              <h3>{translate("Restore backup")}</h3>
              <p>
                {translate(
                  "Preview record counts before replacing this planner.",
                )}
              </p>
            </div>
            <button
              className="button secondary"
              disabled={props.busy}
              onClick={props.onRestore}
            >
              <Upload size={15} />
              {translate("Restore")}
            </button>
          </div>
          <div className="studio-settings-row">
            <div>
              <h3>{translate("Portable profile")}</h3>
              <p>
                {translate(
                  props.online
                    ? "Online exports create an independent local copy."
                    : "Protected local profiles retain their encryption.",
                )}
              </p>
            </div>
            <button
              className="button secondary"
              onClick={props.onPortable}
              disabled={!!demoMode || props.busy}
            >
              <ArrowDownToLine size={15} />
              {translate("Export")}
            </button>
          </div>
          <div className="studio-settings-row">
            <div>
              <h3>{translate("Planner setup")}</h3>
              <p>
                {translate(
                  "Currency: {{currency}} · Payment timezone: Europe/Lisbon", {currency},
                )}
              </p>
            </div>
            <ShieldCheck size={19} />
          </div>
        </section>
        <section className="panel studio-install-settings">
          <InstallApp />
          <div className="studio-storage-note">
            <ShieldCheck size={18} />
            <p>
              {translate(
                demoMode ? "This is fictional demo data held in memory. Financial changes are discarded on refresh." : props.online
                  ? "Your finance records are stored in Firebase under your signed-in account. Cloud records use Firebase access controls and are not encrypted with your local profile password."
                  : browserStorage
                    ? "Your profiles and finance records are saved only in this browser on this device. They are not uploaded to GitHub. Password-protected profiles keep their finance records encrypted."
                    : "Your profiles and finance records are saved in this app's private data folder. Clearing browser data does not remove them.",
              )}
            </p>
          </div>
        </section>
        <section className="panel studio-maintenance">
          <div className="panel-heading">
            <div>
              <h2>{translate("Maintenance")}</h2>
              <p>{translate("Sample records and contextual help")}</p>
            </div>
          </div>
          {props.hasSamples && (
            <div className="studio-settings-row">
              <div>
                <h3>{translate("Remove sample expenses")}</h3>
                <p>
                  {translate("Your own entries and accounts will be kept.")}
                </p>
              </div>
              <button
                className="button secondary"
                onClick={props.onClearSamples}
              >
                <Trash2 size={15} />
                {translate("Remove samples")}
              </button>
            </div>
          )}
          <details className="studio-settings-help">
            <summary>
              <CircleHelp size={18} />
              {translate("Help & guidance")}
            </summary>
            <p>
              {translate(
                "Each month's plan uses income received in the previous month.",
              )}
            </p>
            <p>
              {translate("Transfers keep your combined balance unchanged.")}
            </p>
            <p>
              {translate(
                "Manually tracked. Balances reflect your latest recorded snapshots.",
              )}
            </p>
          </details>
        </section>
      </div>
    </section>
  );
}
