"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import { trackPageView } from "@/lib/tracking";

export default function TrackPageView() {
  const pathname = usePathname();
  const prevPath = useRef(pathname);

  useEffect(() => {
    if (prevPath.current !== pathname) {
      trackPageView();
      prevPath.current = pathname;
    }
  }, [pathname]);

  return null;
}
