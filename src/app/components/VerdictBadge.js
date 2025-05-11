"use client";

import {
  FaCheck,
  FaExclamationTriangle,
  FaQuestionCircle,
  FaTimes,
} from "react-icons/fa";

export default function VerdictBadge({ verdict }) {
  const getVerdictStyle = () => {
    switch (verdict?.toUpperCase()) {
      case "TRUE":
        return {
          bgColor: "bg-verdict-true",
          textColor: "text-white",
          icon: <FaCheck className="mr-2" />,
        };
      case "FALSE":
        return {
          bgColor: "bg-verdict-false",
          textColor: "text-white",
          icon: <FaTimes className="mr-2" />,
        };
      case "PARTIALLY TRUE":
        return {
          bgColor: "bg-verdict-partial",
          textColor: "text-white",
          icon: <FaExclamationTriangle className="mr-2" />,
        };
      case "CONTEXT NOT CLEAR":
        return {
          bgColor: "bg-yellow-500",
          textColor: "text-white",
          icon: <FaQuestionCircle className="mr-2" />,
        };
      default:
        return {
          bgColor: "bg-gray-400",
          textColor: "text-white",
          icon: null,
        };
    }
  };

  const { bgColor, textColor, icon } = getVerdictStyle();

  return (
    <span
      className={`inline-flex items-center px-4 py-2 rounded-full ${bgColor} ${textColor} text-lg font-medium`}
    >
      {icon} {verdict}
    </span>
  );
}
