"use client";

import { submitRating } from '@/actions/rating';
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import useFetch from '@/hooks/use-fetch';
import { cn } from '@/lib/utils';
import { Star } from 'lucide-react';
import React, { useState } from 'react';
import { toast } from 'sonner';

const STARS = [1, 2, 3, 4, 5];

const RatingCard = ({ initialRating }) => {
  const [rating, setRating] = useState(initialRating);
  const [hovered, setHovered] = useState(0);
  const [pending, setPending] = useState(null);

  const { loading, fn: submitRatingFn } = useFetch(submitRating);

  const handleRate = async (score) => {
    if (loading || score === rating) return;

    setPending(score);
    const result = await submitRatingFn(score);
    setPending(null);

    // On failure useFetch has already raised the toast; the stars fall back
    // to the saved rating.
    if (result?.success) {
      setRating(result.data.score);
      toast.success(rating ? "Rating updated" : "Thanks for rating Whealth!");
    }
  };

  const shown = hovered || pending || rating || 0;

  return (
    <Card>
      <CardHeader className="flex flex-col gap-3 space-y-0 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <CardTitle>Enjoying Whealth?</CardTitle>
          <CardDescription className="mt-1">
            {rating
              ? `You rated us ${rating}/5. Tap a star to change it.`
              : "Rate your experience. It counts towards the rating on our home page."}
          </CardDescription>
        </div>

        <div
          role="radiogroup"
          aria-label="Rate Whealth from 1 to 5 stars"
          className="flex items-center gap-1"
          onMouseLeave={() => setHovered(0)}
        >
          {STARS.map((score) => (
            <button
              key={score}
              type="button"
              role="radio"
              aria-checked={rating === score}
              aria-label={`${score} star${score > 1 ? "s" : ""}`}
              disabled={loading}
              onClick={() => handleRate(score)}
              onMouseEnter={() => setHovered(score)}
              className="rounded p-0.5 transition-transform hover:scale-110 disabled:cursor-wait focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <Star
                className={cn(
                  "h-6 w-6",
                  score <= shown
                    ? "fill-yellow-400 text-yellow-400"
                    : "text-muted-foreground"
                )}
              />
            </button>
          ))}
        </div>
      </CardHeader>
    </Card>
  );
};

export default RatingCard;
