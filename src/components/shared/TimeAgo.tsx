
"use client";

import { useState, useEffect } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { cn } from "@/lib/utils"

interface TimeAgoProps {
  dateString: string | undefined | null;
  prefix?: string;
  suffix?: string;
  className?: string;
}

export function TimeAgo({ dateString, prefix = "", suffix = "", className }: TimeAgoProps) {
  const [timeAgo, setTimeAgo] = useState('');

  useEffect(() => {
    let isMounted = true;
    if (!dateString) {
      if (isMounted) setTimeAgo('');
      return;
    }
    try {
      const formattedTime = formatDistanceToNow(new Date(dateString), { addSuffix: true });
      if (isMounted) setTimeAgo(formattedTime);
    } catch (e) {
      console.error("Error formatting time ago", e);
      if (isMounted) setTimeAgo('invalid date');
    }
    return () => { isMounted = false; };
  }, [dateString]);

  if (!timeAgo) {
    // To avoid layout shift, render a placeholder with similar dimensions.
    return <span className={cn("inline-block h-4 w-20 animate-pulse rounded-md bg-muted", className)} />;
  }

  return <span className={className}>{prefix}{timeAgo}{suffix}</span>;
}
