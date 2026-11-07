export const BEST_SELLER_BADGE = 'BÁN CHẠY';
export const NEW_PRODUCT_BADGE = 'MÓN MỚI';

// Some legacy seed data was decoded with an OEM code page before being saved
// to MongoDB. Keep accepting those values so existing local databases render
// correctly without requiring a destructive re-seed.
const LEGACY_BADGES: Record<string, string> = {
  'B├üN CHß║áY': BEST_SELLER_BADGE,
  'BÃN CHáº Y': BEST_SELLER_BADGE,
  'M├ôN Mß╗ÜI': NEW_PRODUCT_BADGE,
  'MÃ“N Má»šI': NEW_PRODUCT_BADGE
};

export const normalizeProductBadge = (value: unknown): string | undefined => {
  if (typeof value !== 'string') return undefined;
  const badge = value.trim();
  if (!badge) return undefined;
  return LEGACY_BADGES[badge] ?? badge;
};
