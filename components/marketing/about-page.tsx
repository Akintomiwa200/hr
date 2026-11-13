"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

const phrases = [
  ["Ship the", "strange idea."],
  ["Make the", "default rare."],
  ["Every pixel,", "on purpose."],
  ["People first,", "work in sync."],
] as const;
const glyphs = " #%&*+=-_/\\<>[]{}?!$@0123456789";

function ScrambleHeadline() {
  const [phraseIndex, setPhraseIndex] = useState(0);
  const [display, setDisplay] = useState<string[]>([...phrases[0]]);
  const [locked, setLocked] = useState(true);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let timer: ReturnType<typeof setTimeout>;
    let frame = 0;
    let active = true;
    let lastRoll = 0;
    let starts: number[] = [];
    let ends: number[] = [];
    let from = "";
    let to = "";
    const begin = (next: number) => {
      from = phrases[phraseIndex].join("\n");
      to = phrases[next].join("\n");
      const now = performance.now();
      const length = Math.max(from.length, to.length);
      starts = Array.from({ length }, (_, i) => now + i * 28 + Math.random() * 120);
      ends = starts.map((start) => start + 180 + Math.random() * 420);
      lastRoll = 0;
      setLocked(false);
      const render = (time: number) => {
        if (!active) return;
        if (document.hidden) { frame = requestAnimationFrame(render); return; }
        if (time - lastRoll >= 50) lastRoll = time;
        const out = Array.from({ length }, (_, i) => {
          const target = to[i] ?? " ";
          if (time < starts[i]) return from[i] ?? " ";
          if (time < ends[i] && target !== " ") return glyphs[Math.floor(Math.random() * glyphs.length)];
          return target;
        }).join("").split("\n");
        setDisplay(out);
        if (time < Math.max(...ends)) frame = requestAnimationFrame(render);
        else {
          setDisplay([...phrases[next]]);
          setPhraseIndex(next);
          setLocked(true);
          timer = setTimeout(() => begin((next + 1) % phrases.length), 2600);
        }
      };
      frame = requestAnimationFrame(render);
    };
    timer = setTimeout(() => begin(1), 2600);
    const onVisibility = () => { if (!document.hidden) lastRoll = performance.now(); };
    document.addEventListener("visibilitychange", onVisibility);
    return () => { active = false; clearTimeout(timer); cancelAnimationFrame(frame); document.removeEventListener("visibilitychange", onVisibility); };
  }, [phraseIndex]);

  const total = phrases[phraseIndex].join("").replace(/\s/g, "").length;
  return <>
    <h1 className="about-title">
      <span className="sr-only">Ship the strange idea.</span>
      <span aria-hidden="true" className="about-lines">
        {display.map((line, index) => <span className="about-line" key={index}>{line.split("").map((char, i) => <span key={i} className={!locked && char !== " " && glyphs.includes(char) ? "about-dud" : undefined}>{char}</span>)}</span>)}
      </span>
    </h1>
    <div className="about-meta" aria-hidden="true"><span>{locked ? `Locked ${total}/${total}` : `Decoding …/${total}`}</span><span>Phrase {phraseIndex + 1} / {phrases.length}</span></div>
  </>;
}

export function AboutPage() {
  return <section className="about-decode">
    <style>{`
      .about-decode{--about-ink:#171329;--about-muted:#706b82;--about-line:rgba(48,39,85,.14);--about-accent:#7b61ff;min-height:calc(100svh - 150px);padding:clamp(20px,4vw,48px);display:grid;grid-template-rows:auto 1fr auto auto;background:linear-gradient(145deg,#fff 4%,#f6f3ff 100%);color:var(--about-ink);font-family:ui-monospace,"SF Mono",SFMono-Regular,Menlo,Consolas,monospace}
      .about-head,.about-meta{display:flex;align-items:center;justify-content:space-between;gap:24px}.about-wordmark{font-size:14px;font-weight:700;color:var(--about-ink);text-decoration:none}.about-nav{display:flex;gap:clamp(14px,2vw,28px)}.about-nav a{font-size:12px;letter-spacing:.08em;text-transform:uppercase;color:var(--about-muted);text-decoration:none;transition:color .2s}.about-nav a:hover,.about-nav a:focus{color:var(--about-accent)}.about-nav a:focus-visible{outline:2px solid var(--about-accent);outline-offset:4px;border-radius:2px}
      .about-main{width:100%;max-width:1120px;justify-self:center;align-self:center;position:relative;padding:clamp(36px,5vw,64px)}.about-mark{position:absolute;color:var(--about-muted);font-size:12px;line-height:1}.about-mark.tl{top:0;left:0}.about-mark.tr{top:0;right:0}.about-mark.bl{bottom:0;left:0}.about-mark.br{bottom:0;right:0}.about-label{display:flex;align-items:center;gap:10px;color:var(--about-muted);font-size:12px;letter-spacing:.14em;text-transform:uppercase}.about-square{width:8px;height:8px;background:var(--about-accent);animation:about-blink 1.1s steps(1,end) infinite}@keyframes about-blink{50%{visibility:hidden}}.about-title{margin:28px 0 0;font-size:clamp(32px,7.4vw,104px);font-weight:650;letter-spacing:-.06em;line-height:1.02}.about-lines{display:block}.about-line{display:block;min-height:1.02em;white-space:pre}.about-dud{color:var(--about-accent);opacity:.9}.about-copy{max-width:46ch;margin:28px 0 0;color:var(--about-muted);font-family:var(--font-inter),ui-sans-serif,system-ui,sans-serif;font-size:15px;line-height:1.7}.about-meta{border-top:1px solid var(--about-line);padding-top:16px;color:var(--about-muted);font-size:11px;letter-spacing:.12em;text-transform:uppercase}.about-meta span{color:var(--about-accent)}@media(max-width:600px){.about-nav{gap:12px}.about-nav a{font-size:10px}.about-main{padding:34px 20px}.about-meta{font-size:9px}}@media(prefers-reduced-motion:reduce){.about-square{animation:none}}
      .about-extra{width:100%;max-width:1120px;justify-self:center;display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:16px;padding:0 clamp(0px,5vw,64px) 28px}.about-extra article{border:1px solid var(--about-line);border-radius:16px;background:rgba(255,255,255,.76);padding:22px}.about-extra h2{font-size:14px;letter-spacing:.02em}.about-extra p{margin-top:10px;color:var(--about-muted);font-family:var(--font-inter),ui-sans-serif,system-ui,sans-serif;font-size:14px;line-height:1.7}@media(max-width:800px){.about-extra{grid-template-columns:1fr}}
      @media(max-width:600px){.about-nav{gap:12px}.about-nav a{font-size:10px}.about-main{padding:34px 20px}.about-meta{font-size:9px}}@media(prefers-reduced-motion:reduce){.about-square{animation:none}}
    `}</style>
    <header className="about-head"><Link className="about-wordmark" href="/">Smart HR /</Link><nav className="about-nav" aria-label="About links"><Link href="/blog">Blog</Link><Link href="/changelog">Changelog</Link><Link href="/contact">Contact</Link></nav></header>
    <main className="about-main"><span className="about-mark tl">+</span><span className="about-mark tr">+</span><span className="about-mark bl">+</span><span className="about-mark br">+</span><div className="about-label"><span className="about-square"/>Company / About</div><ScrambleHeadline/><p className="about-copy">Smart HR brings people operations into one clear workspace. We build practical tools for hiring, attendance, leave, payroll, and growth—so teams can spend less time coordinating work and more time doing it well.</p></main>
    <footer className="about-meta" aria-hidden="true"><span>People operations, decoded</span><span>Smart HR · About</span></footer>
    <section className="about-extra" aria-label="More about Smart HR">
      <article><h2>Built around real work</h2><p>We focus on the everyday tasks that keep an organization moving, giving HR teams and managers a clear place to coordinate people, processes, and decisions.</p></article>
      <article><h2>One connected experience</h2><p>Hiring, attendance, leave, payroll, and development work together in Smart HR, helping teams keep useful context close as people move through their employee journey.</p></article>
      <article><h2>Designed for every role</h2><p>Employees, managers, HR teams, and company leaders each get focused tools and the access they need to act with confidence.</p></article>
    </section>
  </section>;
}
