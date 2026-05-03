import React, { useEffect, useRef, useState, useMemo, useCallback } from "react";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export const CircularTestimonials = ({
  testimonials,
  autoplay = true,
}) => {
  const [activeIndex, setActiveIndex] = useState(0);
  const [containerWidth, setContainerWidth] = useState(1200);
  const imageContainerRef = useRef(null);
  const autoplayIntervalRef = useRef(null);

  const testimonialsLength = useMemo(() => testimonials.length, [testimonials]);
  const activeTestimonial = useMemo(() => testimonials[activeIndex], [activeIndex, testimonials]);

  useEffect(() => {
    function handleResize() {
      if (imageContainerRef.current) setContainerWidth(imageContainerRef.current.offsetWidth);
    }
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    if (autoplay) {
      autoplayIntervalRef.current = setInterval(() => {
        setActiveIndex((prev) => (prev + 1) % testimonialsLength);
      }, 5000);
    }
    return () => { if (autoplayIntervalRef.current) clearInterval(autoplayIntervalRef.current); };
  }, [autoplay, testimonialsLength]);

  const handleNext = useCallback(() => {
    setActiveIndex((prev) => (prev + 1) % testimonialsLength);
    if (autoplayIntervalRef.current) clearInterval(autoplayIntervalRef.current);
  }, [testimonialsLength]);

  const handlePrev = useCallback(() => {
    setActiveIndex((prev) => (prev - 1 + testimonialsLength) % testimonialsLength);
    if (autoplayIntervalRef.current) clearInterval(autoplayIntervalRef.current);
  }, [testimonialsLength]);

  function getImageStyle(index) {
    const gap = containerWidth > 768 ? 200 : 100;
    const offset = (index - activeIndex + testimonialsLength) % testimonialsLength;
    const isActive = index === activeIndex;
    const isLeft = (activeIndex - 1 + testimonialsLength) % testimonialsLength === index;
    const isRight = (activeIndex + 1) % testimonialsLength === index;

    if (isActive) return { zIndex: 10, opacity: 1, transform: "translateX(0) scale(1)", transition: "all 0.8s cubic-bezier(.4,2,.3,1)" };
    if (isLeft) return { zIndex: 5, opacity: 0.5, transform: `translateX(-${gap}px) scale(0.8)`, transition: "all 0.8s cubic-bezier(.4,2,.3,1)" };
    if (isRight) return { zIndex: 5, opacity: 0.5, transform: `translateX(${gap}px) scale(0.8)`, transition: "all 0.8s cubic-bezier(.4,2,.3,1)" };
    return { zIndex: 0, opacity: 0, transform: "scale(0.5)", transition: "all 0.8s" };
  }

  return (
    <div className="w-full max-w-5xl mx-auto py-20 px-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
        <div className="relative h-64 md:h-96" ref={imageContainerRef}>
          {testimonials.map((t, i) => (
            <img key={i} src={t.src} alt={t.name} className="absolute inset-0 w-full h-full object-cover rounded-3xl shadow-2xl" style={getImageStyle(i)} />
          ))}
        </div>
        <div className="space-y-6">
          <AnimatePresence mode="wait">
            <motion.div key={activeIndex} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              <h3 className="text-2xl font-black text-slate-900">{activeTestimonial.name}</h3>
              <p className="text-blue-600 font-bold text-sm uppercase tracking-widest mb-4">{activeTestimonial.designation}</p>
              <p className="text-lg text-slate-600 italic leading-relaxed">"{activeTestimonial.quote}"</p>
            </motion.div>
          </AnimatePresence>
          <div className="flex gap-4 pt-6">
            <button onClick={handlePrev} className="p-4 bg-white border border-slate-200 rounded-full hover:bg-slate-50 transition-all shadow-sm"><ArrowLeft size={24}/></button>
            <button onClick={handleNext} className="p-4 bg-blue-600 text-white rounded-full hover:bg-blue-700 transition-all shadow-lg shadow-blue-600/20"><ArrowRight size={24}/></button>
          </div>
        </div>
      </div>
    </div>
  );
};
