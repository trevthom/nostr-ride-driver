// ════════════════════════════════════════════════════════════
//  CONTACT — Turn a contact method from someone's profile (platform +
//  handle, both untrusted text from relays) into a safe link. Links are
//  built from a FIXED prefix plus a strictly cleaned handle, never from a
//  URL in the profile, so a hostile profile can't smuggle in a
//  `javascript:` link or another site. Returns null when it can't be done.
// ════════════════════════════════════════════════════════════

// A US-style phone number as it is typed: (555) 014-2222. A leading +1 is dropped; extra digits are ignored.
export function formatPhone(value) {
  const digits = String(value || "").replace(/\D/g, "");
  const local = (digits.length === 11 && digits.startsWith("1") ? digits.slice(1) : digits).slice(0, 10);
  if (!local) return "";
  if (local.length < 4) return `(${local}`;
  if (local.length < 7) return `(${local.slice(0, 3)}) ${local.slice(3)}`;
  return `(${local.slice(0, 3)}) ${local.slice(3, 6)}-${local.slice(6)}`;
}

export function contactHref(platform, handle) {
  const h = String(handle || "").trim();
  const digits = h.replace(/[^\d+]/g, "");
  switch (platform) {
    case "Phone": return /^\+?\d{5,}$/.test(digits) ? `tel:${digits}` : null;
    case "WhatsApp": return /^\+?\d{5,}$/.test(digits) ? `https://wa.me/${digits.replace(/\D/g, "")}` : null;
    case "Telegram": { const u = h.replace(/^@/, ""); return /^[A-Za-z0-9_]{4,32}$/.test(u) ? `https://t.me/${u}` : null; }
    case "Signal": return /^\+?\d{7,}$/.test(digits) ? `https://signal.me/#p/${digits.startsWith("+") ? digits : "+" + digits}` : null;
    default: return null;
  }
}
