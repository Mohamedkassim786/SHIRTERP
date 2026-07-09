import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { 
  format, 
  addMonths, 
  subMonths, 
  startOfMonth, 
  endOfMonth, 
  eachDayOfInterval, 
  startOfWeek, 
  endOfWeek, 
  isSameMonth, 
  isSameDay, 
  isToday,
  parseISO
} from 'date-fns';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, X } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';

interface AnimatedDatePickerProps {
  value: string; // Expected format: 'YYYY-MM-DD'
  onChange: (value: string) => void;
  className?: string;
  placeholder?: string;
  required?: boolean;
}

export function AnimatedDatePicker({ 
  value, 
  onChange, 
  className = '', 
  placeholder = 'Select date',
  required 
}: AnimatedDatePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const pickerRef = useRef<HTMLDivElement>(null);
  const [rect, setRect] = useState<DOMRect | null>(null);
  const [direction, setDirection] = useState<'down' | 'up'>('down');
  
  // Track currently viewed month/year in the calendar panel
  const [currentMonth, setCurrentMonth] = useState<Date>(() => {
    if (value) {
      try {
        return parseISO(value);
      } catch (e) {
        return new Date();
      }
    }
    return new Date();
  });

  const parsedValue = value ? parseISO(value) : null;

  // Sync viewed month when value changes and picker is opened
  useEffect(() => {
    if (isOpen && value) {
      try {
        setCurrentMonth(parseISO(value));
      } catch (e) {}
    }
  }, [isOpen, value]);

  // Handle position calculations
  useEffect(() => {
    if (isOpen && containerRef.current) {
      const r = containerRef.current.getBoundingClientRect();
      setRect(r);
      
      const spaceBelow = window.innerHeight - r.bottom;
      const spaceAbove = r.top;
      
      if (spaceBelow < 340 && spaceAbove > spaceBelow) {
        setDirection('up');
      } else {
        setDirection('down');
      }

      const handleScroll = (e: Event) => {
        if (pickerRef.current && pickerRef.current.contains(e.target as Node)) {
          return;
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

  // Click outside detection
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        if (pickerRef.current && pickerRef.current.contains(event.target as Node)) {
          return;
        }
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Generate calendar days
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(monthStart);
  const startDate = startOfWeek(monthStart);
  const endDate = endOfWeek(monthEnd);

  const days = eachDayOfInterval({ start: startDate, end: endDate });

  const handleDaySelect = (day: Date) => {
    onChange(format(day, 'yyyy-MM-dd'));
    setIsOpen(false);
  };

  const handlePrevMonth = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentMonth(subMonths(currentMonth, 1));
  };

  const handleNextMonth = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentMonth(addMonths(currentMonth, 1));
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange('');
    setIsOpen(false);
  };

  const handleToday = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(format(new Date(), 'yyyy-MM-dd'));
    setIsOpen(false);
  };

  const dropdownPortal = isOpen && rect ? createPortal(
    <AnimatePresence>
      <div id="datepicker-portal-root">
        <motion.div
          ref={pickerRef}
          initial={{ opacity: 0, scale: 0.95, y: direction === 'down' ? -10 : 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: direction === 'down' ? -10 : 10 }}
          transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
          onWheel={(e) => e.stopPropagation()}
          onTouchMove={(e) => e.stopPropagation()}
          className="bg-white rounded-2xl border border-slate-200 shadow-xl p-4 w-[320px] select-none"
          style={{
            position: 'fixed',
            top: direction === 'down' ? rect.bottom + 6 : 'auto',
            bottom: direction === 'up' ? window.innerHeight - rect.top + 6 : 'auto',
            left: rect.left,
            zIndex: 99999,
          }}
        >
          {/* Header Controls */}
          <div className="flex items-center justify-between mb-4">
            <button
              type="button"
              onClick={handlePrevMonth}
              className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-600 transition-colors"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <span className="font-semibold text-slate-800 text-sm">
              {format(currentMonth, 'MMMM yyyy')}
            </span>
            <button
              type="button"
              onClick={handleNextMonth}
              className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-600 transition-colors"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>

          {/* Weekday Names */}
          <div className="grid grid-cols-7 gap-1 text-center text-xs font-semibold text-slate-400 mb-2">
            <div>Su</div>
            <div>Mo</div>
            <div>Tu</div>
            <div>We</div>
            <div>Th</div>
            <div>Fr</div>
            <div>Sa</div>
          </div>

          {/* Month Days */}
          <div className="grid grid-cols-7 gap-1">
            {days.map((day, idx) => {
              const isSelected = parsedValue ? isSameDay(day, parsedValue) : false;
              const isCurrentMonth = isSameMonth(day, currentMonth);
              const isCurrentDay = isToday(day);

              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleDaySelect(day)}
                  disabled={!isCurrentMonth}
                  className={`
                    h-9 w-9 rounded-xl flex items-center justify-center text-xs font-medium transition-all
                    ${!isCurrentMonth ? 'text-slate-200 cursor-default' : 'hover:scale-[1.05]'}
                    ${isCurrentMonth && !isSelected && !isCurrentDay ? 'text-slate-700 hover:bg-slate-100' : ''}
                    ${isCurrentDay && !isSelected ? 'text-blue-600 border border-blue-200 font-bold bg-blue-50/50' : ''}
                    ${isSelected ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20 font-bold scale-[1.03]' : ''}
                  `}
                >
                  {format(day, 'd')}
                </button>
              );
            })}
          </div>

          {/* Quick Actions Footer */}
          <div className="flex items-center justify-between mt-4 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={handleClear}
              className="text-xs font-semibold text-red-500 hover:text-red-600 transition-colors px-2 py-1 hover:bg-red-50 rounded-lg"
            >
              Clear
            </button>
            <button
              type="button"
              onClick={handleToday}
              className="text-xs font-semibold text-blue-600 hover:text-blue-700 transition-colors px-2 py-1 hover:bg-blue-50 rounded-lg"
            >
              Today
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>,
    document.body
  ) : null;

  return (
    <div className="animated-input-container relative w-full" ref={containerRef}>
      <div
        className={`animated-input flex items-center justify-between cursor-pointer select-none px-3 py-2 text-sm ${className} ${
          isOpen ? 'border-blue-600' : ''
        }`}
        onClick={() => setIsOpen(!isOpen)}
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            setIsOpen(!isOpen);
          }
        }}
      >
        <span className={`truncate mr-1.5 ${parsedValue ? 'text-slate-800 font-medium' : 'text-slate-400'}`}>
          {parsedValue ? format(parsedValue, 'dd MMM yyyy') : placeholder}
        </span>
        <CalendarIcon className={`h-4 w-4 shrink-0 transition-colors ${isOpen ? 'text-blue-600' : 'text-slate-400'}`} />
      </div>
      
      {/* Background slide/scale border indicator */}
      <div 
        className="animated-input-bg" 
        style={{
          transform: isOpen ? 'scaleX(1)' : 'scaleX(0)',
          transformOrigin: isOpen ? 'right' : 'left',
          backgroundColor: '#2563eb'
        }}
      />
      
      {dropdownPortal}

      {/* Hidden input to facilitate native form compliance */}
      <input
        type="hidden"
        value={value}
        required={required}
        readOnly
      />
    </div>
  );
}
