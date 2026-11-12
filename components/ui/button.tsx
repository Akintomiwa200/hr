import * as React from "react";
import { cn } from "@/lib/utils";

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  asChild?: boolean;
  variant?:
    | "default"
    | "primary"
    | "destructive"
    | "outline"
    | "secondary"
    | "ghost"
    | "link";
  size?: "default" | "sm" | "lg" | "icon" | "md";
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = "default",
      size = "default",
      asChild = false,
      children,
      ...props
    },
    ref
  ) => {
    const variantStyles: Record<string, string> = {
      default: "bg-violet-600 text-white hover:bg-violet-700 shadow-sm",
      primary: "bg-violet-600 text-white hover:bg-violet-700 shadow-sm",
      destructive: "bg-red-600 text-white hover:bg-red-700 shadow-sm",
      outline: "border border-gray-200 bg-white hover:bg-gray-50 text-gray-800",
      secondary: "bg-gray-100 text-gray-900 hover:bg-gray-200",
      ghost: "text-gray-600 hover:bg-gray-100 hover:text-gray-900",
      link: "text-violet-600 underline-offset-4 hover:underline dark:text-violet-400 font-medium",
    };

    const sizeStyles: Record<string, string> = {
      default: "h-9 px-4 py-2 text-sm",
      md: "h-9 px-4 py-2 text-sm",
      sm: "h-8 rounded-md px-3 text-xs",
      lg: "h-10 rounded-md px-6 text-base",
      icon: "h-9 w-9",
    };

    const baseClass = cn(
      "inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-lg text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 disabled:pointer-events-none disabled:opacity-50",
      variantStyles[variant] || variantStyles.default,
      sizeStyles[size] || sizeStyles.default,
      className
    );

    if (asChild && React.isValidElement(children)) {
      const child = children as React.ReactElement<{ className?: string }>;
      return React.cloneElement(child, {
        className: cn(baseClass, child.props.className),
        ...props,
      });
    }

    return (
      <button ref={ref} className={baseClass} {...props}>
        {children}
      </button>
    );
  }
);
Button.displayName = "Button";
