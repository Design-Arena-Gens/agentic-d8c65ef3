"use client";

import { Dispatch, SetStateAction, useCallback, useEffect, useRef, useState } from "react";

type SetValue<T> = Dispatch<SetStateAction<T>>;

function isFunction<T>(value: SetStateAction<T>): value is (prev: T) => T {
  return typeof value === "function";
}

export function useLocalStorage<T>(
  key: string,
  initialValue: T,
): [T, SetValue<T>, boolean] {
  const initialized = useRef(false);
  const [value, setValue] = useState<T>(initialValue);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    try {
      const item = window.localStorage.getItem(key);
      if (item) {
        setValue(JSON.parse(item) as T);
      }
    } catch (error) {
      console.warn(`Failed to read localStorage for ${key}`, error);
    } finally {
      setHydrated(true);
    }
  }, [key]);

  const updateValue = useCallback<SetValue<T>>(
    (next) => {
      setValue((prev) => {
        const resolved = isFunction(next) ? (next as (value: T) => T)(prev) : next;
        try {
          window.localStorage.setItem(key, JSON.stringify(resolved));
        } catch (error) {
          console.warn(`Failed to persist localStorage for ${key}`, error);
        }
        return resolved;
      });
    },
    [key],
  );

  return [value, updateValue, hydrated];
}
