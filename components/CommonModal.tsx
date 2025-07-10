import React from "react";

interface CommonModalProps {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
}

const CommonModal: React.FC<CommonModalProps> = ({ open, onClose, children }) => {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 min-w-[320px] relative">
        <button
          onClick={onClose}
          className="absolute top-2 right-2 text-gray-400 hover:text-gray-700 dark:hover:text-white text-xl"
          aria-label="Kapat"
        >
          ×
        </button>
        {children}
      </div>
    </div>
  );
};

export default CommonModal; 