import React, { useState, useRef, useEffect } from "react";
import { DownVectorIcon } from "../cards/Resources";

const CustomDropdown = ({ options, value, onChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  const selectedOption = options.find((opt) => opt.value === value);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full md:w-[200px] h-10 px-4 rounded-full border border-futarchyGray62 dark:border-futarchyDarkGray42 bg-white dark:bg-futarchyDarkGray3 flex items-center justify-between transition-colors hover:bg-futarchyGray3 dark:hover:bg-futarchyDarkGray42"
      >
        <div className="flex items-center gap-2">
          {selectedOption.icon && (
            <selectedOption.icon className="w-4 h-4 text-futarchyGray11 dark:text-futarchyGray112" />
          )}
          <span className="text-[13.5px] text-futarchyGray12 dark:text-white font-medium">
            {selectedOption.label}
          </span>
        </div>
        <DownVectorIcon className={`w-4 h-4 text-futarchyGray11 dark:text-futarchyGray112 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-1 overflow-hidden rounded-xl border border-futarchyGray62 dark:border-futarchyDarkGray42 bg-white dark:bg-futarchyDarkGray3 shadow-lg z-10">
          {options.map((option) => (
            <button
              key={option.value}
              onClick={() => {
                onChange(option.value);
                setIsOpen(false);
              }}
              className={`w-full px-4 py-2.5 flex items-center gap-2 text-left text-[13.5px] hover:bg-futarchyGray3 dark:hover:bg-futarchyDarkGray42 transition-colors ${
                option.value === value
                  ? "bg-futarchyGray3 dark:bg-futarchyDarkGray42"
                  : ""
              } first:rounded-t-xl last:rounded-b-xl`}
            >
              {option.icon && (
                <option.icon className="w-5 h-5 text-futarchyGray11 dark:text-futarchyGray112" />
              )}
              <span className="text-[13.5px] text-futarchyGray12 dark:text-white font-medium">
                {option.label}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default CustomDropdown;
