import en from "../../../extensions/blinc-reviews-theme/locales/en.default.json";
import cs from "../../../extensions/blinc-reviews-theme/locales/cs.json";
import da from "../../../extensions/blinc-reviews-theme/locales/da.json";
import de from "../../../extensions/blinc-reviews-theme/locales/de.json";
import es from "../../../extensions/blinc-reviews-theme/locales/es.json";
import fi from "../../../extensions/blinc-reviews-theme/locales/fi.json";
import fr from "../../../extensions/blinc-reviews-theme/locales/fr.json";
import it from "../../../extensions/blinc-reviews-theme/locales/it.json";
import ja from "../../../extensions/blinc-reviews-theme/locales/ja.json";
import ko from "../../../extensions/blinc-reviews-theme/locales/ko.json";
import nb from "../../../extensions/blinc-reviews-theme/locales/nb.json";
import nl from "../../../extensions/blinc-reviews-theme/locales/nl.json";
import pl from "../../../extensions/blinc-reviews-theme/locales/pl.json";
import ptBR from "../../../extensions/blinc-reviews-theme/locales/pt-BR.json";
import ptPT from "../../../extensions/blinc-reviews-theme/locales/pt-PT.json";
import sv from "../../../extensions/blinc-reviews-theme/locales/sv.json";
import tr from "../../../extensions/blinc-reviews-theme/locales/tr.json";
import zhCN from "../../../extensions/blinc-reviews-theme/locales/zh-CN.json";
import zhTW from "../../../extensions/blinc-reviews-theme/locales/zh-TW.json";

import { resolveLang } from "./i18n";

// The theme extension's storefront strings (one source of truth), for pages the
// app renders itself through the app proxy, like the email-link review page.

type Storefront = (typeof en)["blinc"];

const FILES: Record<string, { blinc: Storefront }> = {
  en,
  cs,
  da,
  de,
  es,
  fi,
  fr,
  it,
  ja,
  ko,
  nb,
  nl,
  pl,
  "pt-BR": ptBR,
  "pt-PT": ptPT,
  sv,
  tr,
  "zh-CN": zhCN,
  "zh-TW": zhTW,
};

export function storefrontStrings(lang: string | null | undefined): Storefront {
  return (FILES[resolveLang(lang)] ?? en).blinc;
}
