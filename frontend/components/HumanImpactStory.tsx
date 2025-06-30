"use client";

import React, { useState, useEffect, forwardRef, useImperativeHandle } from "react";
import { motion, AnimatePresence } from "framer-motion";

/* ─── API for scene integration ─── */
export interface HumanImpactApi {
  nextStory?: () => void;
  prevStory?: () => void;
  goToStory?: (index: number) => void;
}

/* ─── Story data structure ─── */
interface StoryPart {
  image: string;
  title: string;
  story: string;
  person?: string;
  location?: string;
  year?: string;
  impact?: string;
}

interface Props {
  stories: StoryPart[];
  autoAdvance?: boolean;
  autoDelay?: number;
  variant?: "side-by-side" | "overlay" | "carousel";
  className?: string;
}

const HumanImpactStory = forwardRef<HumanImpactApi, Props>(({
  stories,
  autoAdvance = true,
  autoDelay = 6000,
  variant = "side-by-side",
  className = ""
}, ref) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(autoAdvance);

  /* ─── API methods ─── */
  useImperativeHandle(ref, () => ({
    nextStory: () => setCurrentIndex(prev => (prev + 1) % stories.length),
    prevStory: () => setCurrentIndex(prev => (prev - 1 + stories.length) % stories.length),
    goToStory: (index: number) => setCurrentIndex(Math.max(0, Math.min(index, stories.length - 1)))
  }));

  /* ─── Auto-advance logic ─── */
  useEffect(() => {
    if (!isAutoPlaying) return;
    const timer = setTimeout(() => {
      setCurrentIndex(prev => (prev + 1) % stories.length);
    }, autoDelay);
    return () => clearTimeout(timer);
  }, [currentIndex, isAutoPlaying, autoDelay, stories.length]);

  const currentStory = stories[currentIndex] || stories[0];
  if (!currentStory) return null;

  /* ─── Side-by-side layout ─── */
  const renderSideBySide = () => (
    <div className={`flex items-center min-h-screen ${className}`}>
      <div className="container mx-auto px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          
          {/* Image side */}
          <motion.div
            key={`image-${currentIndex}`}
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -50 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="relative"
          >
            <img
              src={currentStory.image}
              alt={currentStory.title}
              className="w-full h-[60vh] object-cover rounded-2xl shadow-2xl"
            />
            
            {/* Photo metadata */}
            {(currentStory.location || currentStory.year) && (
              <div className="absolute top-6 left-6 bg-black/70 backdrop-blur-sm text-white px-4 py-2 rounded-lg">
                {currentStory.location && <span className="font-medium">{currentStory.location}</span>}
                {currentStory.location && currentStory.year && <span className="mx-2 opacity-70">•</span>}
                {currentStory.year && <span className="opacity-90">{currentStory.year}</span>}
              </div>
            )}

            {/* Person name if available */}
            {currentStory.person && (
              <div className="absolute bottom-6 left-6 bg-white/90 backdrop-blur-sm text-gray-900 px-4 py-2 rounded-lg">
                <span className="font-semibold">{currentStory.person}</span>
              </div>
            )}
          </motion.div>

          {/* Content side */}
          <motion.div
            key={`content-${currentIndex}`}
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 50 }}
            transition={{ duration: 0.8, ease: "easeOut", delay: 0.2 }}
            className="space-y-6"
          >
            <h2 className="text-4xl lg:text-5xl font-bold text-white leading-tight">
              {currentStory.title}
            </h2>

            <div className="prose prose-lg prose-invert max-w-none">
              <p className="text-xl leading-relaxed text-gray-200">
                {currentStory.story}
              </p>
            </div>

            {/* Impact highlight */}
            {currentStory.impact && (
              <div className="bg-red-500/20 border-l-4 border-red-400 p-4 rounded-r-lg">
                <p className="text-red-200 font-medium">
                  <span className="text-red-400 font-bold">Impact: </span>
                  {currentStory.impact}
                </p>
              </div>
            )}

            {/* Story navigation */}
            <div className="flex items-center justify-between pt-8">
              <div className="flex gap-2">
                {stories.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => setCurrentIndex(index)}
                    className={`w-3 h-3 rounded-full transition-all duration-300 ${
                      index === currentIndex 
                        ? 'bg-blue-400 w-8' 
                        : 'bg-gray-600 hover:bg-gray-500'
                    }`}
                  />
                ))}
              </div>

              <div className="flex items-center gap-4 text-sm text-gray-400">
                <span>{currentIndex + 1} / {stories.length}</span>
                <button
                  onClick={() => setIsAutoPlaying(!isAutoPlaying)}
                  className="hover:text-white transition-colors"
                >
                  {isAutoPlaying ? 'Pause' : 'Play'}
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );

  /* ─── Overlay layout ─── */
  const renderOverlay = () => (
    <div className={`relative w-full h-screen ${className}`}>
      <AnimatePresence mode="wait">
        <motion.div
          key={currentIndex}
          initial={{ opacity: 0, scale: 1.1 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
          transition={{ duration: 1, ease: "easeInOut" }}
          className="absolute inset-0"
        >
          <img
            src={currentStory.image}
            alt={currentStory.title}
            className="w-full h-full object-cover"
          />
          
          {/* Dark overlay for text readability */}
          <div className="absolute inset-0 bg-black/40" />
          
          {/* Content overlay */}
          <div className="absolute inset-0 flex items-center justify-center p-8">
            <div className="max-w-4xl text-center space-y-6">
              <motion.h2
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3, duration: 0.8 }}
                className="text-5xl lg:text-6xl font-bold text-white leading-tight"
              >
                {currentStory.title}
              </motion.h2>

              <motion.p
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6, duration: 0.8 }}
                className="text-2xl text-gray-100 leading-relaxed max-w-3xl mx-auto"
              >
                {currentStory.story}
              </motion.p>

              {currentStory.impact && (
                <motion.div
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.9, duration: 0.8 }}
                  className="bg-red-600/80 backdrop-blur-sm px-6 py-4 rounded-lg inline-block"
                >
                  <p className="text-white font-semibold">
                    {currentStory.impact}
                  </p>
                </motion.div>
              )}
            </div>
          </div>
        </motion.div>
      </AnimatePresence>

      {/* Navigation dots */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex gap-3">
        {stories.map((_, index) => (
          <button
            key={index}
            onClick={() => setCurrentIndex(index)}
            className={`w-4 h-4 rounded-full transition-all duration-300 ${
              index === currentIndex 
                ? 'bg-white scale-125' 
                : 'bg-white/50 hover:bg-white/75'
            }`}
          />
        ))}
      </div>
    </div>
  );

  /* ─── Carousel layout ─── */
  const renderCarousel = () => (
    <div className={`relative w-full h-full ${className}`}>
      <div className="flex gap-6 p-6 h-full overflow-x-auto">
        {stories.map((story, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: index * 0.1 }}
            className={`flex-shrink-0 w-80 relative cursor-pointer group ${
              index === currentIndex ? 'ring-4 ring-blue-400' : ''
            }`}
            onClick={() => setCurrentIndex(index)}
          >
            <img
              src={story.image}
              alt={story.title}
              className="w-full h-64 object-cover rounded-lg group-hover:scale-105 transition-transform"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent rounded-lg" />
            <div className="absolute bottom-4 left-4 right-4 text-white">
              <h3 className="font-bold text-lg mb-2">{story.title}</h3>
              <p className="text-sm opacity-90 line-clamp-3">{story.story}</p>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );

  /* ─── Render based on variant ─── */
  switch (variant) {
    case "overlay": return renderOverlay();
    case "carousel": return renderCarousel();
    default: return renderSideBySide();
  }
});

HumanImpactStory.displayName = "HumanImpactStory";

export default HumanImpactStory;