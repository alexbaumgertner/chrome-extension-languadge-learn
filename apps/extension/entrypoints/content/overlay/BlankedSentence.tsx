/** The sentence with its blank (`___`) shown as a chip. */
export default function BlankedSentence({ text }: { text: string }) {
  const parts = text.split(/(_{2,})/);
  return (
    <p className="sw-sentence">
      {parts.map((part, i) =>
        /^_{2,}$/.test(part) ? (
          <span key={i} className="sw-blank">
            {part}
          </span>
        ) : (
          part
        ),
      )}
    </p>
  );
}
