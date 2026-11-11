import { useEffect, useRef, useState } from 'react';
import type { InputHTMLAttributes } from 'react';

// Preserve the editable text even when a form converts an empty value to Number('').
// The form continues to receive its usual change event and numeric payload.
export function NumberInput({ value, onChange, onFocus, onBlur, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  const [draft, setDraft] = useState(String(value ?? ''));
  const focused = useRef(false);
  useEffect(() => {
    if (!focused.current) setDraft(String(value ?? ''));
  }, [value]);
  return <input {...props} type="number" value={draft}
    onFocus={event => {
      focused.current = true;
      if (Number(event.currentTarget.value) === 0) event.currentTarget.select();
      onFocus?.(event);
    }}
    onChange={event => {
      const text = event.currentTarget.value.replace(/^(-?)0+(?=\d)/, '$1');
      event.currentTarget.value = text;
      setDraft(text);
      onChange?.(event);
    }}
    onBlur={event => {
      focused.current = false;
      if (event.currentTarget.value !== '') setDraft(String(value ?? ''));
      onBlur?.(event);
    }} />;
}
