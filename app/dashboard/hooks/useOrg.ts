"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

export type Org = { id: string; name: string };
export type OrgRole = "owner" | "admin" | "mechanic" | "viewer";

const LS_KEY = "garageai.activeOrgId";

export function useOrg() {
  const [orgs, setOrgs] = useState<Org[]>([]);
  const [activeOrgId, setActiveOrgId] = useState<string | null>(null);
  const [role, setRole] = useState<OrgRole | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const activeOrg = useMemo(() => orgs.find(o => o.id === activeOrgId) ?? null, [orgs, activeOrgId]);

  async function load() {
    setLoading(true);
    setErr(null);

    const { data: auth } = await supabase.auth.getUser();
    const userId = auth?.user?.id;
    if (!userId) {
      setOrgs([]);
      setActiveOrgId(null);
      setRole(null);
      setLoading(false);
      return;
    }

    // memberships -> organizations join (simple 2-step to avoid complex typing)
    const mem = await supabase
      .from("org_members")
      .select("org_id, role")
      .eq("user_id", userId);

    if (mem.error) {
      setErr(mem.error.message);
      setLoading(false);
      return;
    }

    const orgIds = (mem.data ?? []).map(m => m.org_id);
    if (orgIds.length === 0) {
      setOrgs([]);
      setActiveOrgId(null);
      setRole(null);
      setLoading(false);
      return;
    }

    const orgRes = await supabase
      .from("organizations")
      .select("id, name")
      .in("id", orgIds)
      .order("created_at", { ascending: true });

    if (orgRes.error) {
      setErr(orgRes.error.message);
      setLoading(false);
      return;
    }

    const list = orgRes.data ?? [];
    setOrgs(list);

    const saved = typeof window !== "undefined" ? window.localStorage.getItem(LS_KEY) : null;
    const initial = saved && list.some(o => o.id === saved) ? saved : list[0]?.id ?? null;
    setActiveOrgId(initial);

    const memRole = (mem.data ?? []).find(m => m.org_id === initial)?.role as OrgRole | undefined;
    setRole(memRole ?? null);

    setLoading(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function setActive(orgId: string) {
    setActiveOrgId(orgId);
    if (typeof window !== "undefined") window.localStorage.setItem(LS_KEY, orgId);
    // role update (fast lookup)
    supabase
      .from("org_members")
      .select("role")
      .eq("org_id", orgId)
      .maybeSingle()
      .then(r => setRole((r.data?.role as OrgRole) ?? null));
  }

  return { orgs, activeOrgId, activeOrg, role, loading, err, reload: load, setActive };
}