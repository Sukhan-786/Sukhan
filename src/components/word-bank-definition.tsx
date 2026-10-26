import Link from "next/link";
import { displayWazanCandidate, type WordBankRow } from "@/lib/word-bank";
export function WordBankDefinition({
  entry,
  inReader = false,
}: {
  entry: WordBankRow;
  inReader?: boolean;
}) {
  const Heading = inReader ? "h3" : "h2",
    Subheading = inReader ? "h4" : "h3";
  return (
    <article
      className="dictionary-definition"
      aria-label={`Source word ${entry.headword}`}
    >
      <Heading lang="ur" dir="rtl">
        {entry.headword}
      </Heading>
      <p>Source word bank · awaiting editorial review</p>
      {!!entry.wazan_candidates.length ? (
        <>
          <Subheading>Wazan candidates · وزن</Subheading>
          <p dir="ltr">
            {entry.wazan_candidates.map(displayWazanCandidate).join(" / ")}
          </p>
          <small>
            1 = short, 2 = long, (1/2) = either. Read left to right. These
            source candidates may over-generate; pronunciation and the complete
            verse determine the bahr.
          </small>
        </>
      ) : (
        <p>Wazan has not been added for this word yet.</p>
      )}
      <p>
        Reviewed definitions and Arabic meanings have not been added for this
        word yet.
      </p>
      <p className="meaning-source">
        Word forms: UrduHack (MIT). Candidate weights: Aruuz Nigar (GPL-3.0).{" "}
        <Link href="/dictionary/sources">Sources and downloadable data</Link>
      </p>
    </article>
  );
}
