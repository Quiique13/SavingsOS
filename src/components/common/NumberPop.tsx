import { useState, type CSSProperties } from "react";

/** Animate formatted highlights without rounding or interpolating financial values. */
export function NumberPop({ value }: { value: string | number }) {
  const text = String(value);
  const [snapshot, setSnapshot] = useState({ text, previous: "", revision: 0 });
  if (text !== snapshot.text) {
    setSnapshot({ text, previous: snapshot.text, revision: snapshot.revision + 1 });
  }
  const characters = Array.from(text);
  const previous = Array.from(snapshot.previous);
  let changed = 0;
  return (
    <span className="number-pop">
      <span className="sr-only">{text}</span>
      <span className="t-digit-group is-animating" aria-hidden="true">
        {characters.map((character, index) => {
          const old = previous[index + previous.length - characters.length];
          if (!/[0-9]/.test(character) || old === character) {
            return <span className="t-digit" data-digit={character} data-same key={`${snapshot.revision}:${index}`} />;
          }
          // Cap the stagger so large balances still settle promptly.
          const style = { "--digit-i": Math.min(changed++, 4) } as CSSProperties;
          return (
            <span className="t-digit-slot" style={style} key={`${snapshot.revision}:${index}`}>
              {old && /[0-9]/.test(old) && <span className="t-digit-old" data-digit={old} />}
              <span className="t-digit" data-digit={character} />
            </span>
          );
        })}
      </span>
    </span>
  );
}
