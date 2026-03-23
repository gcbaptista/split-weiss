"use client";

import { useEffect, useRef } from "react";

import { rememberRecentGroupVisit } from "@/app/actions/group.actions";

export function RecentGroupTracker({ groupId }: { groupId: string }) {
  const sentRef = useRef(false);

  useEffect(() => {
    if (sentRef.current) return;
    sentRef.current = true;

    void rememberRecentGroupVisit(groupId);
  }, [groupId]);

  return null;
}
