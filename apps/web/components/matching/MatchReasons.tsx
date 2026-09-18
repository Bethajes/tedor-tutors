'use client';

import { useState } from 'react';

export function MatchReasons({ reasons }: { reasons: string[] }) {
  const [expanded, setExpanded] = useState(false);
  const topReasons = reasons.slice(0, 3);
  const additional = reasons.slice(3);

  if (reasons.length === 0) return null;

  return (
    <div className="mt-3">
      <ul className="space-y-1.5" aria-label="Top match reasons">
        {topReasons.map((reason, idx) => (
          <li key={idx} className="flex items-start gap-2 text-sm text-slate-700">
            <svg
              className="mt-0.5 h-4 w-4 flex-shrink-0 text-emerald-600"
              viewBox="0 0 20 20"
              fill="currentColor"
              aria-hidden="true"
            >
              <path
                fillRule="evenodd"
                d="M16.704 5.29a1 1 0 010 1.42l-8 8a1 1 0 01-1.42 0l-4-4a1 1 0 011.42-1.42L8 12.58l7.29-7.29a1 1 0 011.414 0z"
                clipRule="evenodd"
              />
            </svg>
            <span>{reason}</span>
          </li>
        ))}
      </ul>
      {additional.length > 0 ? (
        <div className="mt-2">
          <button
            type="button"
            onClick={() => setExpanded((prev) => !prev)}
            className="text-sm font-medium text-slate-600 hover:text-slate-900 underline-offset-2 hover:underline"
            aria-expanded={expanded}
          >
            {expanded ? 'Hide' : `Why this tutor? (${additional.length} more)`}
          </button>
          {expanded ? (
            <ul className="mt-2 space-y-1.5 border-l-2 border-slate-200 pl-3">
              {additional.map((reason, idx) => (
                <li key={idx} className="flex items-start gap-2 text-sm text-slate-600">
                  <svg
                    className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-slate-400"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                    aria-hidden="true"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <span>{reason}</span>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
