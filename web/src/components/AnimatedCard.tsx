import { ReactNode } from 'react';
import { clsx } from 'clsx';

interface AnimatedCardProps {
  children: ReactNode;
  className?: string;
  hover?: 'lift' | 'scale' | 'shadow' | 'none';
  animation?: 'fadeIn' | 'slideUp' | 'slideDown' | 'bounce' | 'none';
  delay?: number;
}

const animationClasses = {
  fadeIn: 'animate-fadeIn',
  slideUp: 'animate-slideUp',
  slideDown: 'animate-slideDown',
  bounce: 'animate-bounce',
  none: '',
};

const hoverClasses = {
  lift: 'hover:shadow-lg hover:-translate-y-1 transition-all duration-200',
  scale: 'hover:scale-105 transition-transform duration-200',
  shadow: 'hover:shadow-lg transition-shadow duration-200',
  none: '',
};

export function AnimatedCard({
  children,
  className,
  hover = 'shadow',
  animation = 'fadeIn',
  delay = 0,
}: AnimatedCardProps) {
  return (
    <div
      className={clsx(
        'rounded-lg border bg-white',
        hoverClasses[hover],
        animationClasses[animation],
        className
      )}
      style={{
        animation: animation !== 'none' ? `${animation} 0.3s ease-out ${delay * 50}ms` : undefined,
      }}
    >
      {children}
    </div>
  );
}

// Add CSS animations via style tag injection
if (typeof document !== 'undefined') {
  const style = document.createElement('style');
  style.innerHTML = `
    @keyframes fadeIn {
      from {
        opacity: 0;
      }
      to {
        opacity: 1;
      }
    }

    @keyframes slideUp {
      from {
        opacity: 0;
        transform: translateY(20px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    @keyframes slideDown {
      from {
        opacity: 0;
        transform: translateY(-20px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    .animate-fadeIn {
      animation: fadeIn 0.3s ease-out;
    }

    .animate-slideUp {
      animation: slideUp 0.3s ease-out;
    }

    .animate-slideDown {
      animation: slideDown 0.3s ease-out;
    }
  `;
  document.head.appendChild(style);
}
