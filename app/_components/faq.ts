export type QA = { q: string; a: string };

export const HOME_FAQ: QA[] = [
  {
    q: "How do I search Calgary building permits?",
    a: "Just type a question in plain English. Examples: 'biggest renovations in Beltline last year', 'who built the most houses in Tuscany', or 'average cost of kitchen renos in 2024'. Our AI translates your question to SQL and runs it against the full City of Calgary permit database.",
  },
  {
    q: "How many permits are indexed?",
    a: "Over 488,000 City of Calgary building permits going back more than a decade, with new permits added daily from the City's open data portal.",
  },
  {
    q: "What data does each permit include?",
    a: "Address, community, permit type and class, work description, applicant, contractor, estimated project cost, square footage, housing units, applied/issued/completed dates, and exact geo-coordinates for mapping.",
  },
  {
    q: "Is this free?",
    a: "Yes — the first 10 questions are free. For power users, a Pro plan at $30/month unlocks 1,000 questions per month.",
  },
  {
    q: "Where does the data come from?",
    a: "The City of Calgary Open Data portal. We ingest the full permits dataset nightly, so what you see is always within 24 hours of the official record.",
  },
  {
    q: "Can I see results on a map?",
    a: "Yes — every query with addresses renders on an interactive map alongside the table, so you can spot geographic patterns instantly.",
  },
  {
    q: "Who is this for?",
    a: "Contractors scouting competitive activity, realtors researching neighborhood investment, journalists investigating development, homeowners vetting renovators, and anyone curious about what's being built in Calgary.",
  },
];

export function faqJsonLd(items: QA[]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((qa) => ({
      "@type": "Question",
      name: qa.q,
      acceptedAnswer: {
        "@type": "Answer",
        text: qa.a,
      },
    })),
  };
}
