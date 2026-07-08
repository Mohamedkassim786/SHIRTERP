import React, { type InputHTMLAttributes } from 'react';

interface AnimatedInputProps extends InputHTMLAttributes<HTMLInputElement> {
  containerClassName?: string;
}

export const AnimatedInput = React.forwardRef<HTMLInputElement, AnimatedInputProps>(
  ({ className = '', containerClassName = '', ...props }, ref) => {
    return (
      <div className={`animated-input-container ${containerClassName}`}>
        <input
          className={`animated-input ${className}`}
          ref={ref}
          {...props}
        />
        <div className="animated-input-bg" />
      </div>
    );
  }
);
AnimatedInput.displayName = 'AnimatedInput';
