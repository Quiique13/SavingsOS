import { useSearchParams } from "react-router-dom";
import { MonthPicker } from "../components/common/MonthPicker";
import { PageHeading } from "../components/common/PageHeading";
import { MonthlySimulator } from "../components/income/MonthlySimulator";
import { today } from "../utils/finance";

export function Simulator() {
  const [parameters, setParameters] = useSearchParams();
  const selected = parameters.get("month");
  const month =
    selected && /^\d{4}-(0[1-9]|1[0-2])$/.test(selected)
      ? selected
      : today().slice(0, 7);
  return (
    <section className="simulator-page">
      <PageHeading
        title="Monthly simulator"
        designTitle="What if this month changes?"
        eyebrow="SIMULATOR / TEMPORARY"
        description="A temporary scenario — saved records stay the same"
      >
        <MonthPicker
          month={month}
          setMonth={(value) =>
            setParameters({ month: value }, { replace: true })
          }
        />
      </PageHeading>
      <MonthlySimulator key={month} month={month} />
    </section>
  );
}
