export function PageHeading({
  kicker,
  title,
  description,
  children,
}: {
  kicker: string;
  title: string;
  description: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="page-heading flex min-w-0 flex-col items-stretch gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <div className="page-kicker">{kicker}</div>
        <h1>
          {title}
          <span className="heading-dot">.</span>
        </h1>
        <p>{description}</p>
      </div>
      {children}
    </div>
  );
}
