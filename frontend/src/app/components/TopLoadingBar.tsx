// components/TopLoadingBar.tsx
import React from 'react';
import { motion } from 'framer-motion';

interface TopLoadingBarProps {
  progress: number;
}

const TopLoadingBar: React.FC<TopLoadingBarProps> = ({ progress }) => (
  <motion.div
    className="fixed top-0 left-0 h-1 bg-blue-600 z-50"
    initial={{ width: 0 }}
    animate={{ width: `${progress}%` }}
    transition={{ duration: 0.5 }}
  />
);

export default TopLoadingBar;