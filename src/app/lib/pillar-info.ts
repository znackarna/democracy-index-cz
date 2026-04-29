import { type Pillar } from '@/lib/types';

/**
 * Lidsky-čitelný kontext per pilíř pro dashboard. Drží stručný digest
 * methodology/pillars.md tak, aby běžný čtenář pochopil:
 *
 * - co pilíř měří (1-2 věty)
 * - jaké subkomponenty obsahuje (3-4 hlavní)
 * - příklady událostí, které skóre **snižují**
 * - příklady událostí, které skóre **zvyšují**
 *
 * Změny tady musí korespondovat s methodology/pillars.md (single source of
 * truth). Pokud se rozchází, plný popis vyhrává.
 */

export interface PillarInfo {
  /** Krátké czech-friendly jméno pilíře pro UI. */
  shortName: string;
  /** Plné jméno (Czech). */
  fullName: string;
  /** 1-2 věty co pilíř měří. */
  description: string;
  /** Hlavní subkomponenty (3-4). */
  subcomponents: readonly string[];
  /** Příklady událostí, které skóre **snižují** (3 položky, různá závažnost). */
  lowerExamples: readonly string[];
  /** Příklady událostí, které skóre **zvyšují** (2 položky). */
  raiseExamples: readonly string[];
}

export const PILLAR_INFO: Record<Pillar, PillarInfo> = {
  electoral: {
    shortName: 'Volby',
    fullName: 'Volební proces a pluralismus',
    description:
      'Schopnost občanů svobodně volit zástupce v férových volbách s reálnou politickou soutěží. Měří **input** demokratického procesu — jak se moc získává a předává.',
    subcomponents: [
      'Férovost voleb (rovný přístup, transparentní financování, regulérnost sčítání)',
      'Politický pluralismus (reálná soutěž více stran, dostupnost veřejnoprávních médií napříč spektrem)',
      'Volební infrastruktura (auditovatelnost, ochrana před zahraniční manipulací)',
      'Pokojné předání moci (respekt k institucionální posloupnosti)',
    ],
    lowerExamples: [
      'Změna volebního zákona ve prospěch jedné strany (severity 4–5)',
      'Odhalení dezinformační kampaně cizího státu zaměřené na konkrétní volby (severity 3–4)',
      'Pokus o zpochybnění výsledků voleb významným politickým aktérem bez důkazů (severity 3)',
    ],
    raiseExamples: [
      'Posílení transparentnosti financování kampaní (severity 2–3)',
      'Úspěšná obrana proti pokusu o volební manipulaci (severity 2–3)',
    ],
  },

  governance: {
    shortName: 'Vládnutí',
    fullName: 'Fungování vlády a parlamentu',
    description:
      'Funkční dělba moci mezi exekutivou a legislativou, dodržování ústavních procesů, kvalita legislativního procesu. Pilíř s nejvyšší vahou — tady se nejčastěji projevují backsliding tendence.',
    subcomponents: [
      'Dělba moci (kontrola exekutivy parlamentem, role prezidenta a Senátu)',
      'Kvalita legislativy (připomínkové řízení, přiměřená legisvakance, vyhýbání se přílepkům)',
      'Stabilita ústavních norem (respekt k nálezům ÚS)',
      'Transparentnost vládnutí (zákon 106, registr smluv, výkaznost ministerstev)',
    ],
    lowerExamples: [
      'Schválení rozsáhlé novely ve zkráceném čtení bez připomínkového řízení (severity 3)',
      'Vláda systematicky ignoruje nález ÚS po > 60 dnech (severity 4)',
      'Premiér odmítá interpelace opozice po dobu měsíců (severity 3)',
    ],
    raiseExamples: [
      'Posílení parlamentní kontroly přes novou vyšetřovací komisi (severity 2–3)',
      'Vláda akceptuje a implementuje nepříjemný nález ÚS (severity 2)',
    ],
  },

  judicial: {
    shortName: 'Justice',
    fullName: 'Soudní nezávislost a právní stát',
    description:
      'Nezávislost soudnictví, předvídatelnost a vymahatelnost práva, ochrana před politickým ovlivňováním justice. Společně s Vládnutím má nejvyšší váhu — útoky na nezávislost justice jsou nejčastějším ukazatelem demokratického backslidingu.',
    subcomponents: [
      'Nezávislost ÚS, NS, NSS (procedury jmenování, nezasahování exekutivy)',
      'Nezávislost obecných soudů (soudcovské rady, ochrana před politickým tlakem na konkrétní soudce)',
      'Nezávislost státního zastupitelství (postavení NSZ, ochrana před politickými instrukcemi)',
      'Rovnost před zákonem (stejné zacházení bez ohledu na politické postavení)',
    ],
    lowerExamples: [
      'Premiér veřejně útočí na konkrétního soudce v probíhající kauze (severity 3–4)',
      'Vláda navrhne novelu zákona o soudech rozšiřující politické zásahy do jmenování (severity 4–5)',
      'Změna kárného řízení směrem ke snazšímu odvolávání soudců politicky kontrolovaným orgánem (severity 5)',
    ],
    raiseExamples: [
      'Posílení role soudcovských rad v personálních věcech (severity 2–3)',
      'Úspěšná obrana proti politickému tlaku na NSZ (severity 2)',
    ],
  },

  media: {
    shortName: 'Média',
    fullName: 'Mediální svoboda',
    description:
      'Pluralita a nezávislost médií, ochrana novinářů, přístup k informacím veřejného zájmu, nezávislost veřejnoprávních médií.',
    subcomponents: [
      'Mediální pluralita (vlastnická diverzita, ochrana před koncentrací)',
      'Nezávislost ČT a ČRo (volba Rady ČT/ČRo, koncesionářské poplatky)',
      'Bezpečnost novinářů (žádné fyzické útoky, právní šikana SLAPP)',
      'Přístup k informacím (zákon 106/1999, otevřená data)',
    ],
    lowerExamples: [
      'Politik podá SLAPP žalobu v hodnotě milionů Kč na investigativního novináře (severity 3)',
      'Akvizice významného média osobou s aktivní politickou rolí (severity 4)',
      'Novela zákona o ČT/ČRo zavádějící politickou volbu generálního ředitele (severity 5)',
    ],
    raiseExamples: [
      'Zlepšení ochrany zdrojů novinářů legislativou (severity 2–3)',
      'Odmítnutí SLAPP žaloby soudem s jasným precedentem (severity 2)',
    ],
  },

  civil: {
    shortName: 'Svobody',
    fullName: 'Občanské svobody',
    description:
      'Svoboda projevu, shromažďování, sdružování; ochrana menšin; rovnost před zákonem v praxi, nikoli jen formálně.',
    subcomponents: [
      'Svoboda projevu (ochrana kritického projevu, absence cenzury)',
      'Svoboda shromažďování (reálné právo demonstrovat, přiměřená policejní reakce)',
      'Svoboda sdružování (NGOs, odbory, ochrana před administrativní šikanou)',
      'Ochrana menšin (Romové, LGBTQ+, migranti, náboženské menšiny)',
      'Práva v digitálním prostoru (soukromí, ochrana před masovým sledováním)',
    ],
    lowerExamples: [
      'Útok policie na pokojnou demonstraci (severity 3–4)',
      'Schválení zákona omezujícího právo demonstrovat za stanovených podmínek (severity 3–5)',
      'Nový zákon o NGO zavádějící povinné registry „zahraničních agentů" (severity 5)',
    ],
    raiseExamples: [
      'Legalizace stejnopohlavních partnerství / manželství (severity 3)',
      'Posílení ochrany před masovým sledováním státem (severity 2–3)',
    ],
  },

  corruption: {
    shortName: 'Korupce',
    fullName: 'Korupce a transparentnost',
    description:
      'Vnímaná i prokázaná míra korupce; transparentnost veřejných zakázek, financování stran, majetkových přiznání; účinnost protikorupčních institucí.',
    subcomponents: [
      'Politická korupce (střet zájmů ústavních činitelů, zneužívání pravomoci)',
      'Veřejné zakázky (transparentnost ZZVZ, registr smluv)',
      'Financování politiky (transparentní účty stran, kontrola Úřadu pro dohled)',
      'Protikorupční instituce (NÚKIB, NKÚ, GIBS, BIS)',
      'Whistleblowing (zákon 171/2023 o ochraně oznamovatelů)',
    ],
    lowerExamples: [
      'Premiér nepřizná aktiva v majetkovém přiznání (severity 4)',
      'Porušení ZZVZ ve velké zakázce s politickou návazností (severity 3–4)',
      'Oslabení pravomocí NKÚ (severity 4–5)',
    ],
    raiseExamples: [
      'Anti-korupční razie NCOZ s zadrženími a EPPO dohledem (severity 3 ↑)',
      'Posílení Úřadu pro dohled nad hospodařením politických stran (severity 3)',
    ],
  },
};
