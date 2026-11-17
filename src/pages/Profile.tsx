import { translate } from "../i18n";
import { PageHeading } from "../components/common/PageHeading";
import { UserSettings } from "../components/users/UserSettings";
import { useUsers } from "../hooks/useUsers";
import { Link } from "react-router-dom";

export function Profile() {
  const { currentUser } = useUsers();
  return (
    <section className="profile-page">
      <PageHeading
        title="Profiles & access"
        designTitle="Your own space."
        eyebrow="PROFILE / ACCESS"
        description="Each user has their own accounts, expenses, income, and payment history."
      />
      <div className="studio-profile-grid">
        <UserSettings />
        <section className="panel">
          <div className="panel-heading">
            <div>
              <h2>
                {translate(
                  currentUser?.authProvider === "firebase"
                    ? "Online account"
                    : "Local user profile",
                )}
              </h2>
              <p>{translate("Your data stays with you")}</p>
            </div>
          </div>
          <div className="studio-profile-copy">
            <p>
              {translate(
                currentUser?.authProvider === "firebase"
                  ? "Your planner syncs through Firebase while you are online. Changes from other devices appear automatically when there are no unsaved edits."
                  : "Password protection encrypts the saved data for this profile. Exported finance backups and older app copies are separate. There is no password recovery. Export a backup regularly.",
              )}
            </p>
            <Link className="button secondary" to="/settings">
              {translate("Backup & restore")}
            </Link>
          </div>
        </section>
      </div>
    </section>
  );
}
