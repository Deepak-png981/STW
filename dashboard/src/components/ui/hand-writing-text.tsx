"use client";

import { motion, Variants } from "framer-motion";

interface HandWrittenTitleProps {
    title?: string;
    subtitle?: string;
}

function HandWrittenTitle({
    title = "",
    subtitle = "",
}: HandWrittenTitleProps) {
    const draw: Variants = {
        hidden: { pathLength: 0, opacity: 0 },
        visible: {
            pathLength: 1,
            opacity: 1,
            transition: {
                duration: 2.5,
                ease: "easeInOut",
                staggerChildren: 0.5,
            },
        },
    };

    return (
        <div className="relative isolate mx-auto w-full max-w-full py-6">
            <div
                className="pointer-events-none absolute inset-[-60%_-6%_-10%_-11%] z-[1] sm:inset-[-6%_-4%_8%_-4%]"
                aria-hidden="true"
            >
                <motion.svg
                    viewBox="0 0 1200 600"
                    preserveAspectRatio="none"
                    initial="hidden"
                    animate="visible"
                    className="h-full w-full text-[#f7f7f4]/42"
                >
                    <title>Decorative hand-drawn underline</title>
                    <g transform="translate(600 300) scale(1.25) translate(-600 -300) translate(52 142)">
                        <motion.path
                            d="M 950 90 
                           C 1250 300, 1050 480, 600 520
                           C 250 520, 150 480, 150 300
                           C 150 120, 350 80, 600 80
                           C 850 80, 950 180, 950 180"
                            fill="none"
                            strokeWidth="12"
                            stroke="currentColor"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            variants={draw}
                            vectorEffect="non-scaling-stroke"
                        />
                    </g>
                </motion.svg>
            </div>
            <div className="relative z-[3] mx-auto flex w-full flex-col items-center px-6 text-center">
                <motion.h1
                    className="relative z-[5] mx-auto max-w-full text-balance"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5, duration: 0.8 }}
                >
                    {title}
                </motion.h1>
                {subtitle && (
                    <motion.p
                        className="mt-2 max-w-2xl text-xl text-white/80"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 1, duration: 0.8 }}
                    >
                        {subtitle}
                    </motion.p>
                )}
            </div>
        </div>
    );
}

export { HandWrittenTitle };