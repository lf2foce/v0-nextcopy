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
    <div className="flex items-center gap-2 bg-gray-100 px-3 py-1.5 rounded-full">
      <div className="flex -space-x-1">
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <circle
            cx="12"
            cy="12"
            r="9"
            fill="#FFC107"
            stroke="#B8860B"
            strokeWidth="1.5"
          />
          <circle
            cx="12"
            cy="12"
            r="6"
            fill="#FFD700"
            stroke="#B8860B"
            strokeWidth="0.5"
          />
        </svg>
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="relative -left-1"
        >
          <circle
            cx="12"
            cy="12"
            r="9"
            fill="#FFC107"
            stroke="#B8860B"
            strokeWidth="1.5"
          />
          <circle
            cx="12"
            cy="12"
            r="6"
            fill="#FFD700"
            stroke="#B8860B"
            strokeWidth="0.5"
          />
        </svg>
      </div>
      <span className="font-medium text-sm">{credits}</span>
    </div>
  );
}
