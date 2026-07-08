import React, { useState, useRef, useEffect, Children, isValidElement } from 'react';
import { ChevronDown } from 'lucide-react';

interface AnimatedSelectProps {
  value: string | number;
  onChange: (e: { target: { value: string } }) => void;
  children: React.ReactNode;
  className?: string;
  required?: boolean;
}

export function AnimatedSelect({ value, onChange, children, className = '', required }: AnimatedSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Parse children to extract options
  const options: { value: string; label: string }[] = [];
  let placeholder = 'Select';

  Children.forEach(children, (child) => {
    if (isValidElement(child) && child.type === 'option') {
      const props = (child as React.ReactElement<any>).props;
      const val = props.value || '';
      const label = props.children || '';
      options.push({ value: String(val), label: String(label) });
      if (val === '' && !placeholder) {
        placeholder = String(label);
      }
    } else if (Array.isArray(child)) {
      child.forEach((c) => {
        if (isValidElement(c) && c.type === 'option') {
          const props = (c as React.ReactElement<any>).props;
          const val = props.value || '';
          const label = props.children || '';
          options.push({ value: String(val), label: String(label) });
        }
      });
    } else if (isValidElement(child) && child.type === React.Fragment) {
       Children.forEach((child as React.ReactElement<any>).props.children, (c) => {
          if (isValidElement(c) && c.type === 'option') {
            const props = (c as React.ReactElement<any>).props;
            const val = props.value || '';
            const label = props.children || '';
            options.push({ value: String(val), label: String(label) });
          }
       });
    }
  });

  const selectedOption = options.find((opt) => String(opt.value) === String(value));

  // Close when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  return (
    <div className={`menu-dropdown ${isOpen ? 'open' : ''} ${className}`} ref={containerRef}>
      <div className="item">
        <div className="link" onClick={() => setIsOpen(!isOpen)}>
          <span className="truncate">
            {selectedOption && selectedOption.value !== '' ? selectedOption.label : <span className="text-slate-400">{selectedOption?.label || placeholder}</span>}
          </span>
          <ChevronDown className="h-4 w-4" />
        </div>
        <ul className="submenu">
          {options.map((opt, i) => (
            <li key={i} className="submenu-item">
              <a
                className="submenu-link"
                onClick={() => {
                  onChange({ target: { value: opt.value } });
                  setIsOpen(false);
                }}
              >
                {opt.label}
              </a>
            </li>
          ))}
        </ul>
      </div>
      {/* Hidden native select for form data/validation compatibility */}
      <select 
        value={value} 
        onChange={onChange} 
        required={required}
        className="hidden"
      >
        {children}
      </select>
    </div>
  );
}
