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
    <div className="fixed top-4 right-4 bg-white/80 backdrop-blur-sm rounded-lg shadow-md px-4 py-2 border border-gray-200 z-50">
      <div className="flex items-center gap-2">
        <span className="font-medium text-gray-700">Credits:</span>
        <span className="font-bold text-indigo-600">{credits}</span>
      </div>
    </div>
  );
}
