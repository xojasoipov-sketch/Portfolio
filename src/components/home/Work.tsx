import { useRef } from "react";
import { Link } from "@tanstack/react-router";
import {
  motion,
  useReducedMotion,
  useScroll,
  useTransform,
} from "framer-motion";
import { PROJECTS, type Project } from "@/data/projects";
import { Arrow } from "@/components/editorial/icons";
import { Reveal } from "./Reveal";
import { Said } from "./Said";

/**
 * The one night scene (uslub.md: --night for the "burilish" only). After
 * the words, the proof: real, running projects. The section slides up over
 * the paper as a dark sheet with rounded shoulders, and each project's
 * screenshot settles into its frame as it comes up the screen.
 */
export function Work() {
  return (
    <section id="work" className="hx-night" data-night>
      <div className="hx-shell">
        <div className="hx-head">
          <Reveal as="p" className="hx-label">
            Ishlar
          </Reveal>
          <Said
            night
            className="hx-big hx-big-night"
            parts={[
              { text: "Lekin gap so'zda emas.", tone: "intro" },
              { text: "Mana,", tone: "key", br: true },
              { text: "ishlab turgan", tone: "serif" },
              { text: "tizimlar.", tone: "key" },
            ]}
          />
        </div>

        <ol className="hx-cases">
          {PROJECTS.map((p) => (
            <Case key={p.id} project={p} />
          ))}
        </ol>
      </div>
    </section>
  );
}

function Case({ project: p }: { project: Project }) {
  const reduce = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });
  const prog = useTransform(scrollYProgress, (v) => v);
  // Settles from a slight push-in to its exact size by mid-screen, so a
  // screenshot is never cropped once the visitor is looking at it.
  const scale = useTransform(prog, [0, 0.45], [1.08, 1]);

  const name = [p.title, p.titleAlt].filter(Boolean).join(" ");

  return (
    <li className="hx-case">
      <Reveal className="hx-case-shot">
        <div
          ref={ref}
          className="hx-case-frame"
          data-poster={p.poster || undefined}
        >
          {p.shot && (
            <motion.img
              src={p.shot}
              alt={`${name} loyihasi ekrani`}
              width={1400}
              height={788}
              loading="lazy"
              decoding="async"
              style={reduce ? undefined : { scale }}
            />
          )}
        </div>
      </Reveal>

      <Reveal className="hx-case-copy" i={1}>
        <p className="hx-case-meta">
          <span>{p.index}</span>
          <span>{p.category}</span>
        </p>
        <h3 className="hx-case-title">{name}</h3>
        <p className="hx-case-summary">{p.summary}</p>
        <p className="hx-case-detail">{p.detail}</p>
        {p.tech.length > 0 && (
          <ul className="hx-tags">
            {p.tech.map((t) => (
              <li key={t}>{t}</li>
            ))}
          </ul>
        )}
        <div className="hx-case-links">
          {p.site && (
            <a
              href={p.site}
              target="_blank"
              rel="noreferrer"
              className="hx-pill"
            >
              Saytni ochish <Arrow direction="upRight" size="0.9em" />
            </a>
          )}
          {p.bot && (
            <a
              href={`https://t.me/${p.bot}`}
              target="_blank"
              rel="noreferrer"
              className="hx-pill"
            >
              Telegram bot <Arrow direction="upRight" size="0.9em" />
            </a>
          )}
          {p.demo && (
            <Link to="/demo" className="hx-pill">
              Demoni ochish <Arrow size="0.9em" />
            </Link>
          )}
        </div>
      </Reveal>
    </li>
  );
}
