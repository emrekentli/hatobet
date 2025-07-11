import React from "react";

interface CommonModalProps {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
}

const CommonModal: React.FC<CommonModalProps> = ({ open, onClose, children }) => {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 bg-black bg-opacity-40 flex justify-center overflow-y-auto">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 w-full max-w-2xl mt-16 mb-16 max-h-[calc(100vh-8rem)] overflow-y-auto relative">
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