import React from "react";
import { Input } from "@/components/ui/input";
import { SelectTrigger } from "@/components/ui/select";

export const ThemedInput = (props) => (
  <Input
    {...props}
    className={`bg-white border border-neutral-300 text-neutral-900 placeholder-neutral-400 dark:bg-neutral-800 dark:border-neutral-700 dark:text-neutral-100 dark:placeholder-neutral-500 transition-colors ${props.className || ''}`}
  />
);

export const ThemedSelectTrigger = (props) => (
  <SelectTrigger
    {...props}
    className={`bg-white border border-neutral-300 text-neutral-900 dark:bg-neutral-800 dark:border-neutral-700 dark:text-neutral-100 transition-colors ${props.className || ''}`}
  />
);
