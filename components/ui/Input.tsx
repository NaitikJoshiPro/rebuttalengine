'use client';

import type { InputHTMLAttributes } from 'react';
import type { UseFormRegisterReturn } from 'react-hook-form';

interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'name'> {
  label?: string;
  name: string;
  required?: boolean;
  error?: string;
  placeholder?: string;
  type?: string;
  register?: UseFormRegisterReturn;
}

export default function Input({
  label,
  name,
  required,
  error,
  placeholder,
  type = 'text',
  register,
  className = '',
  ...rest
}: InputProps) {
  const inputId = `input-${name}`;
  const errorId = `error-${name}`;
  const inputClass = ['form-input', error ? 'error' : '', className]
    .filter(Boolean)
    .join(' ');

  return (
    <div>
      {label && (
        <label htmlFor={inputId} className="form-label">
          {label}
          {required && <span className="form-required">*</span>}
        </label>
      )}
      <input
        id={inputId}
        type={type}
        placeholder={placeholder}
        aria-invalid={!!error}
        aria-describedby={error ? errorId : undefined}
        className={inputClass}
        {...register}
        {...rest}
      />
      {error && (
        <p id={errorId} className="form-error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
