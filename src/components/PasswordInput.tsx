"use client";

import { useState } from "react";

export function PasswordInput({
  id,
  name,
  required,
  minLength,
  placeholder,
  className,
}: {
  id?: string;
  name: string;
  required?: boolean;
  minLength?: number;
  placeholder?: string;
  className?: string;
}) {
  const [show, setShow] = useState(false);

  return (
    <div className="relative">
      <input
        id={id}
        name={name}
        type={show ? "text" : "password"}
        required={required}
        minLength={minLength}
        placeholder={placeholder}
        className={className ?? "w-full rounded-md border border-neutral-300 px-3 py-2 pr-16"}
      />
      <button
        type="button"
        onClick={() => setShow(!show)}
        className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-neutral-500 hover:text-neutral-800 px-2 py-1"
      >
        {show ? "Hide" : "Show"}
      </button>
    </div>
  );
}
