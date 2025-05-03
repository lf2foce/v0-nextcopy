'use client';

import { useEffect, useState } from 'react';
import { useUser } from '@clerk/nextjs';

export function CreditsDisplay() {
  const { isSignedIn } = useUser();
  const [credits, setCredits] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCredits = async () => {
      try {
        const res = await fetch('/api/credits');
        if (!res.ok) {
          throw new Error('Failed to fetch credits');
        }
        const data = await res.json();
        setCredits(data.credits);
      } catch (error) {
        console.error('Error fetching credits:', error);
      } finally {
        setLoading(false);
      }
    };

    if (isSignedIn) {
      fetchCredits();
    } else {
      setLoading(false);
    }
  }, [isSignedIn]);

  if (loading || credits === null) {
    return null;
  }

  return (
    <div className="flex items-center gap-2 bg-white border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] px-3 py-1.5">
      <span className="font-mono font-bold text-black">Credits:</span>
      <span className="font-mono font-black text-blue-600">{credits}</span>
    </div>
  );
}
