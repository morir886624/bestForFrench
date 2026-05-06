import React, { useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { RefreshCw } from 'lucide-react';

const THRESHOLD = 72; // px to pull before triggering

export default function PullToRefresh({ onRefresh, children }) {
    const [pullY, setPullY] = useState(0);
    const [refreshing, setRefreshing] = useState(false);
    const startY = useRef(null);
    const containerRef = useRef(null);

    const isAtTop = () => {
        const el = containerRef.current;
        return !el || el.scrollTop === 0;
    };

    const handleTouchStart = (e) => {
        if (isAtTop()) startY.current = e.touches[0].clientY;
    };

    const handleTouchMove = (e) => {
        if (startY.current === null) return;
        const delta = e.touches[0].clientY - startY.current;
        if (delta > 0) {
            setPullY(Math.min(delta * 0.45, THRESHOLD + 20));
        }
    };

    const handleTouchEnd = async () => {
        if (pullY >= THRESHOLD && !refreshing) {
            setRefreshing(true);
            setPullY(THRESHOLD);
            await onRefresh();
            setRefreshing(false);
        }
        setPullY(0);
        startY.current = null;
    };

    const progress = Math.min(pullY / THRESHOLD, 1);

    return (
        <div
            ref={containerRef}
            className="relative overflow-auto"
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
        >
            {/* Pull indicator */}
            {pullY > 4 && (
                <div
                    className="flex items-center justify-center overflow-hidden transition-all"
                    style={{ height: pullY }}
                >
                    <motion.div
                        animate={{ rotate: refreshing ? 360 : progress * 360 }}
                        transition={refreshing ? { repeat: Infinity, duration: 0.7, ease: 'linear' } : { duration: 0 }}
                    >
                        <RefreshCw
                            className="h-5 w-5 text-indigo-500"
                            style={{ opacity: progress }}
                        />
                    </motion.div>
                </div>
            )}
            {children}
        </div>
    );
}