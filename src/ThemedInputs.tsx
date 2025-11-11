
import * as React from 'react'
import { Input } from '@/components/ui/input'
import { SelectTrigger } from '@/components/ui/select'

export const ThemedInput = (props: React.ComponentProps<'input'>) => (
  <Input
    {...props}
    className={`px-3 py-2 rounded-md bg-white border border-neutral-300 text-neutral-900 placeholder-neutral-400
                dark:bg-neutral-800 dark:border-neutral-700 dark:text-neutral-100 dark:placeholder-neutral-500
                outline-none focus:ring-2 focus:ring-blue-400 transition-colors ${props.className || ''}`}
  />
);

export const ThemedSelectTrigger = (props: React.ComponentProps<'select'>) => (
  <SelectTrigger
    {...props}
    className={`px-3 py-2 rounded-md bg-white border border-neutral-300 text-neutral-900
                dark:bg-neutral-800 dark:border-neutral-700 dark:text-neutral-100
                outline-none focus:ring-2 focus:ring-blue-400 transition-colors ${props.className || ''}`}
  />
);
