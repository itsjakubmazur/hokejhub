/**
 * Czech noun forms after a number: 1 zápas, 2–4 zápasy, 0 and 5+ zápasů, decimals take the
 * genitive singular (1,5 gólu) when given, otherwise the "many" form.
 */
export type CsForms = readonly [one: string, few: string, many: string, decimal?: string];

export function csPlural(n: number, forms: CsForms): string {
  const [one, few, many, decimal] = forms;
  if (!Number.isInteger(n)) return decimal ?? many;
  const a = Math.abs(n);
  if (a === 1) return one;
  if (a >= 2 && a <= 4) return few;
  return many;
}

/** "4 zápasy", "5 zápasů", "1 gól" — number and correctly declined noun. */
export function csCount(n: number, forms: CsForms, format: (n: number) => string = (x) => x.toLocaleString("cs-CZ")): string {
  return `${format(n)} ${csPlural(n, forms)}`;
}

/** Common hockey nouns in nominative/accusative after a number. */
export const CS = {
  zapas: ["zápas", "zápasy", "zápasů", "zápasu"],
  gol: ["gól", "góly", "gólů", "gólu"],
  bod: ["bod", "body", "bodů", "bodu"],
  asistence: ["asistence", "asistence", "asistencí", "asistence"],
  strela: ["střela", "střely", "střel", "střely"],
  zakrok: ["zákrok", "zákroky", "zákroků", "zákroku"],
  sezona: ["sezóna", "sezóny", "sezón", "sezóny"],
  rok: ["rok", "roky", "let", "roku"],
  vyhra: ["výhra", "výhry", "výher", "výhry"],
  prohra: ["prohra", "prohry", "proher", "prohry"],
  divak: ["divák", "diváci", "diváků", "diváka"],
  minuta: ["minuta", "minuty", "minut", "minuty"],
  tip: ["tip", "tipy", "tipů", "tipu"],
  hrac: ["hráč", "hráči", "hráčů", "hráče"],
  nula: ["nula", "nuly", "nul", "nuly"],
  hattrick: ["hattrick", "hattricky", "hattricků", "hattricku"],
  trestnaMinuta: ["trestná minuta", "trestné minuty", "trestných minut", "trestné minuty"],
  den: ["den", "dny", "dní", "dne"],
  hodina: ["hodina", "hodiny", "hodin", "hodiny"],
  clen: ["člen", "členové", "členů", "člena"],
  utkani: ["utkání", "utkání", "utkání", "utkání"],
  kolo: ["kolo", "kola", "kol", "kola"],
  rocnik: ["ročník", "ročníky", "ročníků", "ročníku"],
  /** Instrumental: "s 1 zákrokem", "se 3 zákroky", "s 30 zákroky". */
  zakrokem: ["zákrokem", "zákroky", "zákroky", "zákroku"],
} as const satisfies Record<string, CsForms>;
