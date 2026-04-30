import type { RoastSelection, ScoreBand } from "@shame-the-web/shared";

type RoastTemplate = {
  id: string;
  text: string;
};

export const roastTemplates: Record<ScoreBand, RoastTemplate[]> = {
  lightning: buildTemplates("lightning", [
    "{host} loaded so fast my roast had to file a complaint.",
    "{host} arrived before the awkward silence.",
    "{host} is speedrunning the internet today.",
    "{host} loaded like it had somewhere important to be.",
    "{host} is annoyingly competent. Suspicious, honestly.",
    "{host} just made the loading spinner unemployed.",
    "{host} showed up early and brought snacks.",
    "{host} is moving like it dodged technical debt.",
    "{host} loaded before I finished judging it.",
    "{host} is giving tiny race car energy.",
    "{host} is fast enough to make my Wi-Fi feel respected.",
    "{host} came in hot and left no crumbs.",
    "{host} is what performance budgets dream about.",
    "{host} did not come here to buffer.",
    "{host} loaded like the CDN had a motivational speaker.",
    "{host} is basically wearing running shoes.",
    "{host} made latency look unemployed.",
    "{host} passed the vibe check and the stopwatch check.",
    "{host} is too fast to bully properly.",
    "{host} loaded so cleanly I had to be polite."
  ]),
  good: buildTemplates("good", [
    "{host} is quick enough that I only mildly judged it.",
    "{host} is doing fine. Not heroic, but fine.",
    "{host} loaded with respectable dad-jog energy.",
    "{host} is not breaking records, but it is not breaking spirits.",
    "{host} showed up on time with a slightly wrinkled shirt.",
    "{host} is fast enough to avoid a stern email.",
    "{host} gets a polite nod from the performance goblin.",
    "{host} has main-character potential if it stretches first.",
    "{host} is moving like a site with decent priorities.",
    "{host} is good. The roast department is disappointed.",
    "{host} loaded before my patience started writing a novel.",
    "{host} is the internet equivalent of a clean desk.",
    "{host} is not flashy, but it knows where the exits are.",
    "{host} is cruising in the responsible lane.",
    "{host} avoided the shame bell by a comfortable margin.",
    "{host} feels optimized by someone who drinks water.",
    "{host} is doing the work without making it weird.",
    "{host} is pleasantly unroastable today.",
    "{host} is performance tofu: solid, useful, hard to insult.",
    "{host} can sit with the fast kids, near the edge."
  ]),
  okay: buildTemplates("okay", [
    "{host} loaded eventually, which is technically a strategy.",
    "{host} is giving middle seat on a short flight.",
    "{host} is not slow, it is just dramatically thinking.",
    "{host} got there, but it stopped to admire every script tag.",
    "{host} is a shrug with a favicon.",
    "{host} is moving at spreadsheet-scroll speed.",
    "{host} is fine in the way lukewarm tea is fine.",
    "{host} loaded like it had to check its calendar first.",
    "{host} is not embarrassing, but it should avoid eye contact.",
    "{host} is doing enough to pass, not enough to brag.",
    "{host} has performance energy of a group project.",
    "{host} is one bundle away from a personality change.",
    "{host} is walking, not running, and definitely not stretching.",
    "{host} made me wait just long enough to notice.",
    "{host} is okay. The bar survived, barely.",
    "{host} loaded with the confidence of a printer.",
    "{host} is acceptable, which is the beige of compliments.",
    "{host} feels like it optimized once and retired.",
    "{host} is not a disaster, just a slow clap.",
    "{host} has room to grow, preferably with fewer megabytes."
  ]),
  slow: buildTemplates("slow", [
    "{host} loaded like it was being delivered by pigeon.",
    "{host} made the spinner consider unionizing.",
    "{host} is powered by suspense and unused JavaScript.",
    "{host} took a scenic route through every dependency.",
    "{host} loaded with the urgency of a Monday morning.",
    "{host} is not slow, it is performing a loading monologue.",
    "{host} brought a backpack full of assets nobody asked for.",
    "{host} made my patience open a second tab.",
    "{host} moves like CSS is negotiating a treaty.",
    "{host} is one hero image away from fossil status.",
    "{host} loaded like it was assembling itself from IKEA.",
    "{host} has a performance budget and a shopping problem.",
    "{host} is dragging scripts like emotional baggage.",
    "{host} made broadband feel like dial-up cosplay.",
    "{host} is giving 'just one more npm package' energy.",
    "{host} loaded after I mentally aged three business days.",
    "{host} is the reason progress bars develop trust issues.",
    "{host} has more blocking time than a calendar invite.",
    "{host} showed up late and blamed the network.",
    "{host} is slow enough to make coffee nervous."
  ]),
  fossil: buildTemplates("fossil", [
    "{host} loaded from the archaeological layer of the web.",
    "{host} is less a website and more a patience endurance test.",
    "{host} made the loading spinner ask for PTO.",
    "{host} is being rendered by candlelight, apparently.",
    "{host} arrived by fax and still missed the deadline.",
    "{host} is what happens when bundles discover hoarding.",
    "{host} made time feel server-rendered in 1998.",
    "{host} is slower than a meeting about naming variables.",
    "{host} loaded like each byte needed manager approval.",
    "{host} is carrying enough JavaScript to qualify as freight.",
    "{host} turned my browser into a waiting room.",
    "{host} is sponsored by unnecessary third-party tags.",
    "{host} made the CPU sigh audibly.",
    "{host} is the digital equivalent of wet cement.",
    "{host} loaded after the joke stopped being funny.",
    "{host} is not a page load, it is a hostage negotiation.",
    "{host} has performance numbers that need a wellness check.",
    "{host} made the internet feel manually operated.",
    "{host} is proof that bytes can have commitment issues.",
    "{host} should apologize to the back button."
  ])
};

export function getRoastCategory(score: number): ScoreBand {
  if (score >= 90) {
    return "lightning";
  }

  if (score >= 70) {
    return "good";
  }

  if (score >= 45) {
    return "okay";
  }

  if (score >= 25) {
    return "slow";
  }

  return "fossil";
}

export function pickRoast(input: {
  score: number;
  hostname: string;
  recentTemplateIds: string[];
}): RoastSelection {
  const category = getRoastCategory(input.score);
  const templates = roastTemplates[category];
  const recentIds = new Set(input.recentTemplateIds);
  const availableTemplates = templates.filter((template) => !recentIds.has(template.id));
  const pool = availableTemplates.length > 0 ? availableTemplates : templates;
  const template = pool[Math.abs(hash(`${input.hostname}:${input.score}`)) % pool.length] ?? templates[0];

  return {
    category,
    templateId: template.id,
    message: template.text.replace("{host}", input.hostname),
    subline: `Speed score: ${input.score}/100`
  };
}

function buildTemplates(category: ScoreBand, messages: string[]): RoastTemplate[] {
  return messages.map((text, index) => ({
    id: `${category}-${index + 1}`,
    text
  }));
}

function hash(value: string): number {
  return [...value].reduce((accumulator, character) => {
    return (accumulator << 5) - accumulator + character.charCodeAt(0);
  }, 0);
}
