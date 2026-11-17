import { translate, useLanguage } from "../../i18n";
import { useTheme } from "../../hooks/useTheme";
import { isDesignTheme } from "../../utils/appearance";
export function PageHeading({
  title,
  description,
  children,
  designTitle,
  eyebrow,
}: {
  title: string;
  description: string;
  children?: React.ReactNode;
  designTitle?: string;
  eyebrow?: string;
}) {
  useLanguage();
  const { uiTheme } = useTheme();
  const studio = isDesignTheme(uiTheme);
  return (
    <div className="page-heading">
      <div>
        {studio && <span className="studio-eyebrow">{translate(eyebrow ?? title)}</span>}
        <h1>{translate(studio && designTitle ? designTitle : title)}</h1>
        <p>{translate(description)}</p>
      </div>
      {children}
    </div>
  );
}
