import React, { useState, useEffect } from 'react';

interface AnimatedTitleProps {
  title: string;
  onAnimationComplete: () => void;
}

const AnimatedTitle: React.FC<AnimatedTitleProps> = ({ title, onAnimationComplete }) => {
  const [displayedText, setDisplayedText] = useState('');
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    if (currentIndex < title.length) {
      const timeout = setTimeout(() => {
        setDisplayedText((prev) => prev + title[currentIndex]);
        setCurrentIndex((prev) => prev + 1);
      }, 50); // Adjust typing speed here (milliseconds per character)
      return () => clearTimeout(timeout);
    } else {
      onAnimationComplete();
    }
  }, [currentIndex, title, onAnimationComplete]);

  return <span>{displayedText}</span>;
};

export default AnimatedTitle;
