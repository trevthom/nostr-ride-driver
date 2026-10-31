// ════════════════════════════════════════════════════════════
//  USE BACKUP — Keeps the encrypted backup (lib/backup.js) in step. Mounted once by AppProvider for the signed-in person.
//  It is always on: there is no switch and no screen for it. Every saved setting goes to the person's relays as ONE note that only
//  their secret key can open.
//    1. At login it looks for the person's backup note on the relays. If it is NEWER than what this device last saw, the
//       settings, the block list, the trusted contacts and the vouch list are put back (the screens are then drawn again with
//       them: `onRestored`). A vouch list that is only in the backup, or is newer there than the public event, is published
//       again. Nothing is ever SENT before that check is done, and a device with nothing saved sends nothing at all, so a
//       fresh phone can never overwrite the backup (and the other app's blocks and vouches) with its empty state.
//    2. A change to any saved setting (a few seconds later) or to the vouch list (checked every minute) sends a new backup,
//       but only when the content really changed. A note no relay accepted waits in the outbox (nostr/relay.js) and is sent later.
// ════════════════════════════════════════════════════════════

import { useCallback, useEffect, useRef } from "react";
import { relay } from "../nostr/relay.js";
import { EVENT_KINDS } from "../nostr/eventKinds.js";
import { getRelays, getSetting, setSetting, onSettingWrite } from "../config/relays.js";
import { allowedKey, applyBackup, backupDigest, backupEvent, backupHasContent, backupVouches, collectBackup, openBackup, sealBackup } from "../lib/backup.js";
import { newestVouchEvent, vouchEvent, vouchList, vouchesToPublish } from "../lib/vouches.js";

const DEBOUNCE_MS = 4000;
const POLL_MS = 60000;

export function useBackup({ user, publish, onRestored }) {
  const me = user?.publicKey;
  const ready = useRef(false);
  const last = useRef("");
  const timer = useRef(null);
  const live = useRef({});
  live.current = { user, publish, onRestored };

  // The newest backup note this person has on the relays, opened (or null).
  const fetchRemote = useCallback(async () => {
    const u = live.current.user;
    const events = await relay.pool.querySync(getRelays(), { kinds: [EVENT_KINDS.SETTINGS_BACKUP], authors: [u.publicKey] });
    for (const e of events.sort((a, b) => b.created_at - a.created_at)) {
      let sealed = null;
      try { sealed = JSON.parse(e.content).sealed; } catch { /* not ours */ }
      const data = sealed ? openBackup(sealed, u.sk, u.publicKey) : null;
      if (data) return data;
    }
    return null;
  }, []);

  const restore = useCallback(async (data) => {
    applyBackup(data);
    // The public vouch list is the copy the other app reads. Publish the backup's list when the public event is missing
    // or older than this snapshot (an empty list is a real removal). A newer public list is never undone.
    const vouches = backupVouches(data);
    const { user: u, publish: pub } = live.current;
    const newest = newestVouchEvent(u.publicKey);
    const next = vouchesToPublish(vouchList(u.publicKey), newest?.created_at || 0, vouches, data.at, u.publicKey);
    if (next) { const ev = vouchEvent(next); await pub(ev.kind, ev.content, ev.tags); }
    setSetting("backupAt", data.at);
    last.current = backupDigest(collectBackup(u.publicKey));
    live.current.onRestored?.();
  }, []);

  const push = useCallback(async () => {
    const { user: u, publish: pub } = live.current;
    if (!u || !ready.current) return;
    const data = collectBackup(u.publicKey);
    const digest = backupDigest(data);
    if (digest === last.current) return;
    try {
      const ev = backupEvent(sealBackup(data, u.sk, u.publicKey));
      await pub(ev.kind, ev.content, ev.tags);
      last.current = digest;
      setSetting("backupAt", data.at);
    } catch { /* the next change or the next minute tries again */ }
  }, []);

  // 1. At login: look first, send later.
  useEffect(() => {
    if (!me) return undefined;
    let alive = true;
    ready.current = false;
    (async () => {
      let found = false;
      try {
        const remote = await fetchRemote();
        if (!alive) return;
        if (remote) {
          found = true;
          if (remote.at > getSetting("backupAt", 0)) await restore(remote);
          else last.current = backupDigest(collectBackup(me));
        }
      } catch { /* the relays did not answer */ }
      if (!alive) return;
      ready.current = true;
      if (!found) {
        // No note was read. Only send one when this device has something worth keeping; otherwise a fresh app signing
        // in before a relay answers would replace the person's note with an empty one (and erase their blocks and
        // vouches for the other app). A saved setting or the minute timer sends the first real note later.
        const snapshot = collectBackup(me);
        if (backupHasContent(snapshot)) push();
        else last.current = backupDigest(snapshot);
      }
    })();
    return () => { alive = false; ready.current = false; };
  }, [me]); // eslint-disable-line react-hooks/exhaustive-deps

  // 2. Changes: a few seconds after a saved setting, and every minute for the vouch list.
  useEffect(() => {
    if (!me) return undefined;
    const off = onSettingWrite((key) => {
      if (!allowedKey(key) && key !== "relays") return;
      clearTimeout(timer.current);
      timer.current = setTimeout(() => push(), DEBOUNCE_MS);
    });
    const id = setInterval(() => push(), POLL_MS);
    return () => { off(); clearInterval(id); clearTimeout(timer.current); };
  }, [me, push]);
}
