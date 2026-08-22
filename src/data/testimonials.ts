/**
 * Client testimonials.
 *
 * Intentionally empty. Inventing praise would be the single most damaging
 * thing this site could do — a fabricated quote sitting next to real prices is
 * worse than no quote at all, and it is exactly the kind of claim a
 * prospective client can check. The section does not render at all while this
 * array is empty, so the live site never shows a hollow "what clients say" box.
 *
 * To publish one, add an entry with the client's actual words and their
 * permission:
 *
 *   {
 *     quote: "…",
 *     author: "Ism Familiya",
 *     role: "Direktor",
 *     company: "Kompaniya nomi",
 *     project: "SadiPrime",   // optional — ties it to a case on the site
 *   }
 */
export interface Testimonial {
  quote: string;
  author: string;
  role?: string;
  company?: string;
  /** Which project the work was on, when it maps to one shown on the site. */
  project?: string;
}

export const TESTIMONIALS: Testimonial[] = [];
