"use client";

import React, { useState, useEffect, forwardRef, useImperativeHandle } from "react";
import { motion } from "framer-motion";
import { Quote, Play, Pause } from "lucide-react";

/* ─── API for scene integration ─── */
export interface OpeningQuoteHeroApi {
  play?: () => void;
  pause?: () => void;
  restart?: () => void;
}

interface Props {
  quote: string;
  speaker?: string;
  location?: string;
  year?: string;
  backgroundImage: string;
  chapterTitle?: string;
  chapterSubtitle?: string;
  autoPlay?: boolean;
  className?: string;
}

const OpeningQuoteHero = forwardRef<OpeningQuoteHeroApi, Props>(({
  quote,
  speaker,
  location,
  year,
  backgroundImage,
  chapterTitle = "Chapter 2",
  chapterSubtitle = "Wie das Eis verschwindet",
  autoPlay = true,
  className = ""
}, ref) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [isPlaying, setIsPlaying] = useState(autoPlay);
  const [hasStarted, setHasStarted] = useState(false);

  /* ─── Animation steps ─── */
  const steps = [
    "background",    // 0: Background image loads
    "chapter",       // 1: Chapter title appears
    "quote-icon",    // 2: Quote icon appears
    "quote-text",    // 3: Main quote text
    "speaker",       // 4: Speaker attribution
    "complete"       // 5: All visible
  ];

  /* ─── API methods ─── */
  useImperativeHandle(ref, () => ({
    play: () => setIsPlaying(true),
    pause: () => setIsPlaying(false),
    restart: () => {
      setCurrentStep(0);
      setHasStarted(false);
      setIsPlaying(true);
    }
  }));

  /* ─── Auto-progression logic ─── */
  useEffect(() => {
    if (!isPlaying || currentStep >= steps.length - 1) return;
    
    const delays = [1000, 2000, 3000, 4000, 5500, 6000]; // Different delay for each step
    const timer = setTimeout(() => {
      setCurrentStep(prev => Math.min(prev + 1, steps.length - 1));
      if (!hasStarted) setHasStarted(true);
    }, delays[currentStep] || 2000);

    return () => clearTimeout(timer);
  }, [currentStep, isPlaying, hasStarted, steps.length]);

  /* ─── Animation variants ─── */
  const fadeInUp = {
    hidden: { opacity: 0, y: 30 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.8, ease: "easeOut" } }
  };

  const fadeInScale = {
    hidden: { opacity: 0, scale: 0.8 },
    visible: { opacity: 1, scale: 1, transition: { duration: 1, ease: "easeOut" } }
  };

  const slideInLeft = {
    hidden: { opacity: 0, x: -50 },
    visible: { opacity: 1, x: 0, transition: { duration: 0.8, ease: "easeOut" } }
  };

  return (
    <div className={`relative w-full h-screen overflow-hidden ${className}`}>
      
      {/* Background Image with Parallax Effect */}
      <motion.div
        initial={{ scale: 1.1, opacity: 0 }}
        animate={{ 
          scale: currentStep >= 0 ? 1 : 1.1, 
          opacity: currentStep >= 0 ? 1 : 0 
        }}
        transition={{ duration: 2, ease: "easeOut" }}
        className="absolute inset-0"
      >
        <img
          src={backgroundImage}
          alt="Uummannaq, Greenland"
          className="w-full h-full object-cover"
        />
        
        {/* Sophisticated gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/50 to-black/70" />
        <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-transparent to-black/40" />
      </motion.div>

      {/* Main Content Container */}
      <div className="absolute inset-0 flex items-center justify-center p-8">
        <div className="max-w-6xl text-center space-y-8">
          
          {/* Chapter Title */}
          <motion.div
            variants={slideInLeft}
            initial="hidden"
            animate={currentStep >= 1 ? "visible" : "hidden"}
            className="space-y-2"
          >
            <h1 className="text-5xl lg:text-7xl font-bold text-white tracking-tight">
              {chapterTitle}
            </h1>
            <h2 className="text-2xl lg:text-3xl font-light text-blue-200 tracking-wide">
              {chapterSubtitle}
            </h2>
            <div className="w-24 h-1 bg-blue-400 mx-auto mt-4 rounded-full" />
          </motion.div>

          {/* Quote Icon */}
          <motion.div
            variants={fadeInScale}
            initial="hidden"
            animate={currentStep >= 2 ? "visible" : "hidden"}
          >
            <Quote className="w-20 h-20 text-blue-400 mx-auto" />
          </motion.div>

          {/* Main Quote */}
          <motion.blockquote
            variants={fadeInUp}
            initial="hidden"
            animate={currentStep >= 3 ? "visible" : "hidden"}
            className="text-3xl lg:text-5xl font-light text-white leading-relaxed italic max-w-4xl mx-auto"
          >
            "{quote}"
          </motion.blockquote>

          {/* Speaker Attribution */}
          <motion.div
            variants={fadeInUp}
            initial="hidden"
            animate={currentStep >= 4 ? "visible" : "hidden"}
            className="space-y-3"
          >
            {speaker && (
              <p className="text-xl lg:text-2xl text-blue-200 font-medium">
                — {speaker}
              </p>
            )}
            {(location || year) && (
              <p className="text-lg text-gray-300">
                {location}{location && year && ', '}{year}
              </p>
            )}
          </motion.div>

          {/* Subtitle Context */}
          <motion.div
            variants={fadeInUp}
            initial="hidden"
            animate={currentStep >= 5 ? "visible" : "hidden"}
            className="pt-8"
          >
            <p className="text-lg lg:text-xl text-gray-200 max-w-3xl mx-auto leading-relaxed">
              Through voices from Uummannaq and ten years of satellite data, 
              we'll explore what happens when an entire way of life melts away.
            </p>
            <p className="text-md text-blue-300 mt-4">
              A story of loss, adaptation, and the power of memory.
            </p>
          </motion.div>
        </div>
      </div>

      {/* Controls */}
      <div className="absolute bottom-8 left-8 flex items-center gap-4">
        <button
          onClick={() => setIsPlaying(!isPlaying)}
          className="flex items-center gap-2 bg-black/50 backdrop-blur-sm text-white px-4 py-2 rounded-lg hover:bg-black/70 transition-colors"
        >
          {isPlaying ? <Pause size={16} /> : <Play size={16} />}
          <span className="text-sm">{isPlaying ? 'Pause' : 'Play'}</span>
        </button>
        
        <div className="text-xs text-gray-400">
          Step {currentStep + 1} / {steps.length}
        </div>
      </div>

      {/* Progress Indicator */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex gap-2">
        {steps.map((_, index) => (
          <div
            key={index}
            className={`w-2 h-2 rounded-full transition-all duration-300 ${
              index <= currentStep ? 'bg-blue-400' : 'bg-white/30'
            }`}
          />
        ))}
      </div>

      {/* Attribution */}
      <div className="absolute bottom-4 right-4 text-xs text-gray-400 text-right">
        <p>"Heart of a Seal" documentation</p>
        <p>Uummannaq, Greenland</p>
      </div>

      {/* Scroll Indicator */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: currentStep >= 5 ? 1 : 0 }}
        transition={{ delay: 1 }}
        className="absolute bottom-12 left-1/2 -translate-x-1/2"
      >
        <motion.div
          animate={{ y: [0, 10, 0] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          className="text-white/70 text-center"
        >
          <div className="w-6 h-10 border-2 border-white/40 rounded-full flex justify-center">
            <div className="w-1 h-3 bg-white/60 rounded-full mt-2"></div>
          </div>
          <p className="text-xs mt-2">Scroll to continue</p>
        </motion.div>
      </motion.div>
    </div>
  );
});

OpeningQuoteHero.displayName = "OpeningQuoteHero";

export default OpeningQuoteHero;