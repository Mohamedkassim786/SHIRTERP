import React, { useState, useRef, useEffect, Children, isValidElement } from 'react';
import { createPortal } from 'react-dom';
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
  const ulRef = useRef<HTMLUListElement>(null);
  const [rect, setRect] = useState<DOMRect | null>(null);
  const [direction, setDirection] = useState<'down' | 'up'>('down');

  // Helper to parse children safely without converting arrays to comma-separated strings
  const parseLabel = (children: React.ReactNode): string => {
    if (Array.isArray(children)) {
      return children.map(child => (typeof child === 'string' || typeof child === 'number' ? child : '')).join('');
    }
    return String(children || '');
  };

  // Parse children to extract options
  const options: { value: string; label: string }[] = [];
  let placeholder = 'Select';

  Children.forEach(children, (child) => {
    if (isValidElement(child) && child.type === 'option') {
      const props = (child as React.ReactElement<any>).props;
      const val = props.value || '';
      const label = parseLabel(props.children);
      options.push({ value: String(val), label: label });
      if (val === '' && !placeholder) {
        placeholder = label;
      }
    } else if (Array.isArray(child)) {
      child.forEach((c) => {
        if (isValidElement(c) && c.type === 'option') {
          const props = (c as React.ReactElement<any>).props;
          const val = props.value || '';
          const label = parseLabel(props.children);
          options.push({ value: String(val), label: label });
        }
      });
    } else if (isValidElement(child) && child.type === React.Fragment) {
      Children.forEach((child as React.ReactElement<any>).props.children, (c) => {
        if (isValidElement(c) && c.type === 'option') {
          const props = (c as React.ReactElement<any>).props;
          const val = props.value || '';
          const label = parseLabel(props.children);
          options.push({ value: String(val), label: label });
        }
      });
    }
  });

  const selectedOption = options.find((opt) => String(opt.value) === String(value));

  useEffect(() => {
    if (isOpen && containerRef.current) {
      const r = containerRef.current.getBoundingClientRect();
      setRect(r);
      
      // Calculate available space
      const spaceBelow = window.innerHeight - r.bottom;
      const spaceAbove = r.top;
      
      // If there's not enough space below (less than 250px) and more space above, open upwards
      if (spaceBelow < 250 && spaceAbove > spaceBelow) {
        setDirection('up');
      } else {
        setDirection('down');
      }
      
      const handleScroll = (e: Event) => {
        if (ulRef.current && ulRef.current.contains(e.target as Node)) {
          return; // Ignore scrolling inside the dropdown
        }
        setIsOpen(false);
      };
      const handleResize = () => setIsOpen(false);

      window.addEventListener('scroll', handleScroll, true);
      window.addEventListener('resize', handleResize);
      return () => {
        window.removeEventListener('scroll', handleScroll, true);
        window.removeEventListener('resize', handleResize);
      };
    }
  }, [isOpen]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        if (ulRef.current && ulRef.current.contains(event.target as Node)) {
          return;
        }
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const dropdownPortal = isOpen && rect ? createPortal(
    <ul 
      ref={ulRef}
      className={`submenu ${isOpen ? 'submenu-open' : ''}`}
      onWheel={(e) => e.stopPropagation()}
      onTouchMove={(e) => e.stopPropagation()}
      style={{ 
        position: 'fixed',
        top: direction === 'down' ? rect.bottom : 'auto',
        bottom: direction === 'up' ? window.innerHeight - rect.top : 'auto',
        left: rect.left, 
        width: 'max-content',
        minWidth: rect.width,
        maxWidth: 'calc(100vw - 32px)',
        maxHeight: direction === 'down' 
          ? `min(300px, calc(100vh - ${rect.bottom + 10}px))` 
          : `min(300px, calc(${rect.top - 10}px))`,
        margin: 0,
        padding: '4px 0',
        listStyle: 'none',
        boxSizing: 'border-box',
        overflowY: 'auto',
        overflowX: 'hidden',
        zIndex: 99999,
        pointerEvents: 'auto'
      }}
    >
      {options.map((opt, i) => (
        <li key={i} className="submenu-item">
          <a
            className="submenu-link"
            title={opt.label}
            onClick={() => {
              onChange({ target: { value: opt.value } });
              setIsOpen(false);
            }}
          >
            {opt.label}
          </a>
        </li>
      ))}
    </ul>,
    document.body
  ) : null;

  return (
    <div className={`menu-dropdown ${isOpen ? 'open' : ''} w-full relative`} ref={containerRef}>
      <div className="item w-full">
        <div className={`link ${className}`} onClick={() => setIsOpen(!isOpen)}>
          <span className="truncate">
            {selectedOption && selectedOption.value !== '' ? selectedOption.label : <span className="text-slate-400">{selectedOption?.label || placeholder}</span>}
          </span>
          <ChevronDown className="h-4 w-4 shrink-0" />
        </div>
      </div>
      {dropdownPortal}
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
