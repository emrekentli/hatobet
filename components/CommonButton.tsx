import React from "react";

interface CommonButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  color?: "blue" | "red" | "gray" | "green";
  size?: "sm" | "md" | "lg";
  children: React.ReactNode;
}

const colorMap = {
  blue: "bg-blue-600 text-white hover:bg-blue-700",
  red: "bg-red-600 text-white hover:bg-red-700",
  gray: "bg-gray-200 text-gray-700 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600",
  green: "bg-green-600 text-white hover:bg-green-700",
};

const sizeMap = {
  sm: "px-2 py-1 text-xs",
  md: "px-4 py-2 text-sm",
  lg: "px-6 py-3 text-base",
};

const CommonButton: React.FC<CommonButtonProps> = ({
  color = "blue",
  size = "md",
  children,
  className = "",
  ...props
}) => {
  return (
    <button
      className={`rounded font-medium focus:outline-none focus:ring-2 focus:ring-offset-2 ${colorMap[color]} ${sizeMap[size]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
};

export default CommonButton; 