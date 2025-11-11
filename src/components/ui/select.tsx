
import * as React from 'react'
export const SelectTrigger = React.forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement>>(
  ({ className = '', children, ...props }, ref) => <select ref={ref} className={className} {...props}>{children}</select>
)
SelectTrigger.displayName = 'SelectTrigger'
