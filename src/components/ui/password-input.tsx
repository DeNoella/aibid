'use client';

import { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { cn } from '@/components/ui/utils';

interface PasswordInputProps extends React.ComponentProps<typeof Input> {
  leftIcon?: React.ReactNode;
}

export function PasswordInput({ className, leftIcon, ...props }: PasswordInputProps) {
  const [visible, setVisible] = useState(false);

  return (
    <div className="relative">
      {leftIcon && (
        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none">
          {leftIcon}
        </div>
      )}
      <Input
        {...props}
        type={visible ? 'text' : 'password'}
        className={cn(leftIcon ? 'pl-10' : '', 'pr-10', className)}
      />
      <button
        type="button"
        onClick={() => setVisible((value) => !value)}
        className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
        aria-label={visible ? 'Hide password' : 'Show password'}
      >
        {visible ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
      </button>
    </div>
  );
}
