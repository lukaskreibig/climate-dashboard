"use client";

import React, { useState, forwardRef, useImperativeHandle, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

/* ─── API for scene integration ─── */
export interface HumanImpactApi {
  nextStory?: () => void;
  prevStory?: () => void;
  goToStory?: (index: number) => void;
  setCaptionSide?: (side: "left" | "right" | "center") => void;
}

/* ─── Simplified story data structure ─── */
interface StoryImage {
  image: string;
  alt?: string;
}

interface Props {
  images: StoryImage[];
  className?: string;
  transition?: "fade" | "slide";
  captionSide?: "left" | "right" | "center";
}

const HumanImpactStory = forwardRef<HumanImpactApi, Props>(({
  images,
  className = "",
  transition = "fade",
  captionSide = "center"
}, ref) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [imageAspectRatio, setImageAspectRatio] = useState<'wide' | 'tall' | 'square'>('wide');
  const [activeCaptionSide, setActiveCaptionSide] = useState<"left" | "right" | "center">(captionSide);

  /* ─── Sync with prop changes ─── */
  useEffect(() => {
    setActiveCaptionSide(captionSide);
  }, [captionSide]);

  /* ─── API methods ─── */
  useImperativeHandle(ref, () => ({
    nextStory: () => setCurrentIndex(prev => (prev + 1) % images.length),
    prevStory: () => setCurrentIndex(prev => (prev - 1 + images.length) % images.length),
    goToStory: (index: number) => setCurrentIndex(Math.max(0, Math.min(index, images.length - 1))),
    setCaptionSide: (side: "left" | "right" | "center") => setActiveCaptionSide(side)
  }));

  const currentImage = images[currentIndex] || images[0];
  if (!currentImage) return null;

  /* ─── Detect image aspect ratio ─── */
  const handleImageLoad = (event: React.SyntheticEvent<HTMLImageElement>) => {
    const img = event.currentTarget;
    const aspectRatio = img.naturalWidth / img.naturalHeight;
    
    if (aspectRatio > 1.5) {
      setImageAspectRatio('wide');
    } else if (aspectRatio < 0.75) {
      setImageAspectRatio('tall');
    } else {
      setImageAspectRatio('square');
    }
  };

  /* ─── Animation variants ─── */
  const fadeVariants = {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    exit: { opacity: 0 }
  };

  const slideVariants = {
    initial: { opacity: 0, x: 50 },
    animate: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: -50 }
  };

  const variants = transition === "slide" ? slideVariants : fadeVariants;

  /* ─── Dynamic styling based on aspect ratio and caption position ─── */
  const getImageContainerClass = () => {
    let baseClass = "flex items-center min-h-screen w-full p-8";
    
    // Adjust positioning based on caption side
    switch (activeCaptionSide) {
      case 'left':
        baseClass += " justify-end pr-16 pl-8"; // Move image to right when caption is left
        break;
      case 'right':
        baseClass += " justify-start pl-16 pr-8"; // Move image to left when caption is right
        break;
      default:
        baseClass += " justify-center"; // Center when caption is center
        break;
    }
    
    // Add aspect ratio specific padding
    switch (imageAspectRatio) {
      case 'wide':
        return `${baseClass}`;
      case 'tall':
        return `${baseClass} px-32`;
      case 'square':
        return `${baseClass}`;
      default:
        return `${baseClass}`;
    }
  };

  const getImageClass = () => {
    const baseClass = "rounded-2xl shadow-2xl object-contain";
    
    // Adjust max width based on caption position
    const maxWidthClass = activeCaptionSide === 'center' ? 'max-w-[70vw]' : 'max-w-[50vw]';
    
    switch (imageAspectRatio) {
      case 'wide':
        return `${baseClass} ${maxWidthClass} max-h-[75vh]`;
      case 'tall':
        return `${baseClass} h-[80vh] max-w-[45vw]`;
      case 'square':
        return `${baseClass} ${maxWidthClass} max-h-[75vh]`;
      default:
        return `${baseClass} ${maxWidthClass} max-h-[75vh]`;
    }
  };

  return (
    <div className={`relative w-full h-full bg-gradient-to-br from-gray-900 via-black to-gray-900 ${className}`}>
      <AnimatePresence mode="wait">
        <motion.div
          key={`image-${currentIndex}`}
          initial="initial"
          animate="animate"
          exit="exit"
          variants={variants}
          transition={{ 
            duration: 0.8, 
            ease: "easeInOut"
          }}
          className={getImageContainerClass()}
        >
          <img
            src={currentImage.image}
            alt={currentImage.alt || `Story image ${currentIndex + 1}`}
            className={getImageClass()}
            onLoad={handleImageLoad}
            style={{ 
              filter: 'brightness(0.95) contrast(1.05)',
            }}
          />
          
          {/* Subtle image counter for reference */}
          <div className="absolute bottom-8 right-8 bg-black/50 backdrop-blur-sm text-white px-3 py-1 rounded-lg text-sm">
            {currentIndex + 1} / {images.length}
          </div>
        </motion.div>
      </AnimatePresence>

      {/* Optional: Subtle progress indicators */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex gap-2">
        {images.map((_, index) => (
          <div
            key={index}
            className={`w-2 h-2 rounded-full transition-all duration-300 ${
              index === currentIndex 
                ? 'bg-white w-6' 
                : 'bg-white/30'
            }`}
          />
        ))}
      </div>
    </div>
  );
});

HumanImpactStory.displayName = "HumanImpactStory";

export default HumanImpactStory;