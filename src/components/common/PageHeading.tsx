import { translate, useLanguage } from "../../i18n";
export function PageHeading({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children?: React.ReactNode;
}) {
  useLanguage();
  return (
    <div className="page-heading">
      <div>
        <h1>{translate(title)}</h1>
        <p>{translate(description)}</p>
      </div>
      {children}
    </div>
  );
}
