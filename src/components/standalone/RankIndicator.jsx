// src/components/standalone/RankIndicator.jsx
import React, { useState, useEffect } from 'react';

export default function RankIndicator({ rank = 0 }) {
    // Ensure rank is between 0 and 5
    const safeRank = Math.min(5, Math.max(0, parseInt(rank) || 0));

    return (
        <div class="rank-indicator-container">
            <h3 class="title">Urgency</h3>
            <div className="rank-indicator" title={`Rank: ${safeRank} out of 5`}>
                {[1, 2, 3, 4, 5].map((blockRank) => (
                    <div
                        key={blockRank}
                        className={`rank-indicator__block ${blockRank <= safeRank ? 'active' : ''}`}
                        aria-hidden="true"
                    />
                ))}
                <span className="sr-only">Rank: {safeRank} out of 5</span>
            </div>
        </div>
    );
}