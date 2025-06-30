"use client";

import React, { useState, useEffect, forwardRef, useImperativeHandle } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight } from "lucide-react";

/* ─── API for scene integration ─── */
export interface PhotoStoryApi {
  nextPhoto?: () => void;
  prevPhoto?: () => void;
  goToPhoto?: (index: number) => void;
}

/* ─── Photo data structure ─── */
interface Photo {
  src: string;
  alt: string;
  caption?: string;
  location?: string;
  year?: string;
}

interface Props {
  photos: Photo[];
  autoplay?: boolean;
  autoplayDelay?: number;
  showNavigation?: boolean;
  variant?: "single" | "comparison" | "slideshow";
  className?: string;
}

const PhotoStory = forwardRef<PhotoStoryApi, Props>(({
  photos,
  autoplay = false,
  autoplayDelay = 4000,
  showNavigation = true,
  variant = "single",
  className = ""
}, ref) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(autoplay);

  /* ─── API methods ─── */
  useImperativeHandle(ref, () => ({
    nextPhoto: () => setCurrentIndex(prev => (prev + 1) % photos.length),
    prevPhoto: () => setCurrentIndex(prev => (prev - 1 + photos.length) % photos.length),
    goToPhoto: (index: number) => setCurrentIndex(Math.max(0, Math.min(index, photos.length - 1)))
  }));

  /* ─── Autoplay logic ─── */
  useEffect(() => {
    if (!isPlaying) return;
    const interval = setInterval(() => {
      setCurrentIndex(prev => (prev + 1) % photos.length);
    }, autoplayDelay);
    return () => clearInterval(interval);
  }, [isPlaying, autoplayDelay, photos.length]);

  const currentPhoto = photos[currentIndex] || photos[0];
  if (!currentPhoto) return null;

  /* ─── Render variants ─── */
  const renderSingle = () => (
    <div className={`relative w-full h-full ${className}`}>
      <AnimatePresence mode="wait">
        <motion.div
          key={currentIndex}
          initial={{ opacity: 0, scale: 1.05 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ duration: 0.6, ease: "easeInOut" }}
          className="absolute inset-0"
        >
          <img
            src={currentPhoto.src}
            alt={currentPhoto.alt}
            className="w-full h-full object-cover rounded-lg"
          />
          
          {/* Photo metadata overlay */}
          {(currentPhoto.location || currentPhoto.year) && (
            <div className="absolute top-4 left-4 bg-black/70 text-white px-3 py-1 rounded-md text-sm">
              {currentPhoto.location && <span>{currentPhoto.location}</span>}
              {currentPhoto.location && currentPhoto.year && <span className="mx-2">•</span>}
              {currentPhoto.year && <span>{currentPhoto.year}</span>}
            </div>
          )}

          {/* Caption overlay */}
          {currentPhoto.caption && (
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-6">
              <p className="text-white text-lg leading-relaxed">{currentPhoto.caption}</p>
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      {/* Navigation */}
      {showNavigation && photos.length > 1 && (
        <>
          <button
            onClick={() => setCurrentIndex(prev => (prev - 1 + photos.length) % photos.length)}
            className="absolute left-4 top-1/2 -translate-y-1/2 bg-white/20 hover:bg-white/30 backdrop-blur-sm rounded-full p-2 text-white transition-colors"
          >
            <ChevronLeft size={24} />
          </button>
          <button
            onClick={() => setCurrentIndex(prev => (prev + 1) % photos.length)}
            className="absolute right-4 top-1/2 -translate-y-1/2 bg-white/20 hover:bg-white/30 backdrop-blur-sm rounded-full p-2 text-white transition-colors"
          >
            <ChevronRight size={24} />
          </button>

          {/* Dots indicator */}
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
            {photos.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentIndex(index)}
                className={`w-2 h-2 rounded-full transition-colors ${
                  index === currentIndex ? 'bg-white' : 'bg-white/50'
                }`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );

  const renderComparison = () => (
    <div className={`relative w-full h-full ${className}`}>
      <div className="grid grid-cols-2 gap-4 h-full">
        {photos.slice(0, 2).map((photo, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, x: index === 0 ? -20 : 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: index * 0.2 }}
            className="relative"
          >
            <img
              src={photo.src}
              alt={photo.alt}
              className="w-full h-full object-cover rounded-lg"
            />
            {photo.year && (
              <div className="absolute top-4 left-4 bg-black/70 text-white px-3 py-1 rounded-md font-semibold">
                {photo.year}
              </div>
            )}
            {photo.caption && (
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4">
                <p className="text-white text-sm">{photo.caption}</p>
              </div>
            )}
          </motion.div>
        ))}
      </div>
    </div>
  );

  const renderSlideshow = () => (
    <div className={`relative w-full h-full ${className}`}>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 h-full p-4">
        {photos.map((photo, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4, delay: index * 0.1 }}
            className="relative cursor-pointer group"
            onClick={() => setCurrentIndex(index)}
          >
            <img
              src={photo.src}
              alt={photo.alt}
              className="w-full h-full object-cover rounded-md group-hover:scale-105 transition-transform"
            />
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors rounded-md" />
          </motion.div>
        ))}
      </div>

      {/* Large preview */}
      {currentIndex >= 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="absolute top-4 right-4 w-1/3 h-1/2 bg-black/90 rounded-lg p-2"
        >
          <img
            src={currentPhoto.src}
            alt={currentPhoto.alt}
            className="w-full h-full object-cover rounded"
          />
        </motion.div>
      )}
    </div>
  );

  /* ─── Render based on variant ─── */
  switch (variant) {
    case "comparison": return renderComparison();
    case "slideshow": return renderSlideshow();
    default: return renderSingle();
  }
});

PhotoStory.displayName = "PhotoStory";

export default PhotoStory;