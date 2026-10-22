import db from "../../db.server";

/** Creates the shop with default settings on first install, or reactivates it on reinstall. */
export function ensureShop(domain: string) {
  return db.shop.upsert({
    where: { domain },
    create: { domain, settings: { create: {} } },
    update: { uninstalledAt: null },
  });
}

/** Keeps shop data until shop/redact arrives (48 hours after uninstall), so a quick reinstall loses nothing. */
export function markShopUninstalled(domain: string) {
  return db.shop.updateMany({
    where: { domain },
    data: { uninstalledAt: new Date() },
  });
}
