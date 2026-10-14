/*
 * Decade4U: checking a new intention before anyone prays for it.
 *
 * 1. Quick checks: contact details, links, a small word list.
 * 2. Llama Guard (Cloudflare Workers AI): harmful content.
 * 3. A small AI model answers our own questions about the intention.
 *
 * Result:
 *   "approved" - clearly fine, people can pray for it straight away
 *   "pending"  - unsure, in crisis, or the AI was unavailable: the maintainer decides
 *   "rejected" - clearly abusive or not an intention: refused with a gentle message
 *
 * Rule: if anything goes wrong, the answer is "pending", never "approved".
 */

const EMAIL = /[^\s@]+@[^\s@]+\.[a-z]{2,}/i;
const PHONE = /(\+?\d[\d\s().-]{7,}\d)/;
const LINK = /(https?:\/\/|www\.|\.(com|net|org|it|io|ly)\b)/i;

// Whole words only (so "Scunthorpe" or "assistant" are never blocked).
// The AI check catches insults in other languages and spellings; this list is a fast first filter.
// Out of respect, no blasphemies are written in this code: the AI recognises and refuses them.
// Sinhala words can be added later.
const BLOCK_WORDS = [
  // English
  "fuck", "fucking", "fucker", "motherfucker", "shit", "bullshit", "bitch", "bastard", "asshole", "arsehole",
  "dick", "dickhead", "cock", "cunt", "twat", "wanker", "prick", "slut", "whore", "hoe", "skank",
  "retard", "retarded", "nigger", "nigga", "faggot", "fag", "dyke", "tranny", "spic", "chink", "kike",
  "paki", "wetback", "pussy", "dildo", "cum", "jizz",
  "kill yourself", "kys", "go die",
  // Italian
  "cazzo", "cazzi", "cazzone", "vaffanculo", "fanculo", "affanculo", "stronzo", "stronza", "stronzi",
  "puttana", "puttane", "troia", "troie", "zoccola", "mignotta", "bastardo", "bastarda",
  "coglione", "coglioni", "cogliona", "minchia", "figa", "fica", "pompino", "frocio", "froci",
  "finocchio", "ricchione", "culattone", "negro", "negri", "terrone", "terroni", "merda", "merde",
  "ammazzati", "crepa", "vai a morire"
];

// Words that can appear in sincere intentions ("for victims of sex trafficking") but need a person's eye.
const REVIEW_WORDS = ["sex", "sexual", "porn", "pornography", "nude", "nudes", "horny", "abuse", "abused", "rape", "raped", "stupro", "violentata", "pornografia"];

const CRISIS = [
  "suicide", "suicidal", "kill myself", "end my life", "take my own life", "want to die",
  "don't want to live", "dont want to live", "do not want to live", "don't want to be alive", "do not want to be alive",
  "no reason to live", "end it all", "better off dead", "better off without me", "self harm", "self-harm", "hurt myself", "cut myself", "overdose",
  "suicidio", "suicidarmi", "uccidermi", "togliermi la vita", "farla finita", "voglio morire",
  "non voglio più vivere", "non voglio piu vivere", "non ce la faccio più a vivere", "meglio morto", "meglio morta", "farmi del male", "autolesion"
];

function hasWord(text, list) {
  const t = " " + text.toLowerCase().replace(/[^\p{L}\p{N}' -]/gu, " ") + " ";
  return list.some((w) => t.includes(" " + w + " ") || (w.includes(" ") && t.includes(w)));
}

export function quickChecks(intention, thanks) {
  const all = intention + " " + thanks;
  if (EMAIL.test(all) || PHONE.test(all)) return { decision: "rejected", reason: "contact details", message: "Please remove contact details like phone numbers or email addresses." };
  if (LINK.test(all)) return { decision: "rejected", reason: "link", message: "Intentions can't contain web links." };
  if (hasWord(all, BLOCK_WORDS)) return { decision: "rejected", reason: "word filter", message: "This intention contains words we can't accept. Please write it respectfully." };
  const crisis = CRISIS.some((w) => all.toLowerCase().includes(w));
  return { decision: "continue", crisis, review: hasWord(all, REVIEW_WORDS) };
}

const QUESTIONS = `You help moderate a Catholic website where people share short prayer intentions and strangers pray a decade of the rosary for them.
Read the intention and answer ONLY with JSON, no other text:
{"prayer_intention": true|false, "identifying_details": true|false, "crisis": true|false, "hateful_or_mocking": true|false, "advertising_or_spam": true|false}
- prayer_intention: a sincere request for prayer for oneself, someone else, a situation or the world (any language). Thanksgiving intentions count.
- identifying_details: ONLY true if the text contains a surname, a street or home address, a phone number, or the name of a specific workplace, school or small town that could identify a private person. Family words ("my mother", "my son", "a friend"), first names alone, illnesses, accidents, exams and jobs in general are NOT identifying details.
- crisis: the writer may be in danger or thinking of suicide or self-harm.
- hateful_or_mocking: insults, hatred toward a person or group, sexual content, mockery of faith, or any blasphemy or disrespect toward God, Jesus, Mary or the saints (in any language, including common Italian blasphemous exclamations).
- advertising_or_spam: selling, promoting, or gibberish.`;

function parseJson(value) {
  // Workers AI may hand back the answer already as an object, or as text containing JSON.
  if (value && typeof value === "object") {
    if ("prayer_intention" in value) return value;
    if ("response" in value) return parseJson(value.response);
  }
  const m = String(value || "").match(/\{[\s\S]*\}/);
  if (!m) return null;
  try { return JSON.parse(m[0]); } catch (e) { return null; }
}

// Could this text name a specific person or place? Counts capitalised words that don't start
// a sentence (ignoring holy names). One is fine (a first name); two or more, or any number, might be.
const HOLY = ["I", "God", "Jesus", "Christ", "Mary", "Lord", "Holy", "Spirit", "Virgin", "Our", "Lady", "Saint", "St",
  "Dio", "Gesù", "Cristo", "Signore", "Madonna", "Santo", "Santa", "Spirito", "Vergine"];
export function mayIdentify(text) {
  if (/\d/.test(text)) return true;
  const words = text.match(/[\p{L}'’]+|[.!?:;]/gu) || [];
  let caps = 0, start = true;
  for (const w of words) {
    if (/^[.!?:;]$/.test(w)) { start = true; continue; }
    const bare = w.replace(/['’]s$/, "");
    if (!start && /^\p{Lu}/u.test(w) && !HOLY.includes(bare)) caps++;
    start = false;
  }
  return caps >= 2;
}

export async function moderate(env, intention, thanks) {
  const quick = quickChecks(intention, thanks);
  if (quick.decision === "rejected") return { ...quick, care: false };
  const care = quick.crisis;
  const review = quick.review; // sensitive words: never approved automatically

  if (!env.AI) return { decision: "pending", reason: "AI not connected", care };

  try {
    const text = thanks ? `Intention: ${intention}\nThank-you message: ${thanks}` : `Intention: ${intention}`;

    // 2. Llama Guard
    const guard = await env.AI.run("@cf/meta/llama-guard-3-8b", { messages: [{ role: "user", content: text }] });
    const guardText = JSON.stringify(guard.response ?? guard).toLowerCase();
    const unsafe = guardText.includes("unsafe");
    // Llama Guard categories: S1 violent crimes, S3 sex crimes, S4 child exploitation, S9 weapons,
    // S10 hate, S12 sexual content -> refused. S11 self-harm -> crisis care. Anything else
    // (for example S7 privacy) -> a person decides.
    const cats = unsafe ? (guardText.match(/s\d+/g) || []) : [];
    const HARD = ["s1", "s3", "s4", "s9", "s10", "s12"];
    const hardUnsafe = cats.some((c) => HARD.includes(c));
    const selfHarm = cats.includes("s11");
    const otherUnsafe = unsafe && !hardUnsafe && !selfHarm;

    // 3. Our own questions
    const out = await env.AI.run("@cf/meta/llama-3.1-8b-instruct-fp8-fast", {
      messages: [{ role: "system", content: QUESTIONS }, { role: "user", content: text }],
      max_tokens: 80,
      temperature: 0
    });
    const a = parseJson(out);
    if (!a) return { decision: "pending", reason: "AI answer unreadable: " + JSON.stringify(out).slice(0, 150), care };

    const crisis = care || a.crisis === true || selfHarm;
    const summary = `guard:${unsafe ? "unsafe" : "safe"} ai:${JSON.stringify(a)}`;

    if (a.hateful_or_mocking === true || hardUnsafe)
      return { decision: "rejected", reason: summary, care: crisis, message: "This intention can't be accepted. Please write it respectfully, as a prayer request." };
    if (a.advertising_or_spam === true && a.prayer_intention !== true)
      return { decision: "rejected", reason: summary, care: crisis, message: "This doesn't look like a prayer intention. Please write what you'd like prayed for." };
    if (crisis) return { decision: "pending", reason: summary, care: true };
    // The small AI model is over-cautious about family and health details, so its "identifying"
    // flag only counts when the text actually contains something name- or place-like.
    const identifying = a.identifying_details === true && mayIdentify(intention + ". " + thanks);
    if (identifying || otherUnsafe) return { decision: "pending", reason: summary, care: false };
    if (review) return { decision: "pending", reason: "sensitive words; " + summary, care: false };
    if (a.prayer_intention === true) return { decision: "approved", reason: summary, care: false };
    return { decision: "pending", reason: summary, care: false };
  } catch (e) {
    // Out of free AI allowance, or any other problem: a person decides.
    return { decision: "pending", reason: "AI unavailable: " + String(e && e.message || e).slice(0, 80), care };
  }
}
