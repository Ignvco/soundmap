import type { InputHTMLAttributes, ReactNode } from "react";
export function Field({ label, children }: { label: string; children: ReactNode }) {
  return <label className="grid gap-1 text-sm text-muted-foreground min-w-0"><span>{label}</span>{children}</label>;
}
export function NumberField({ label, value, onValue, ...props }: Omit<InputHTMLAttributes<HTMLInputElement>, "onChange" | "value"> & { label: string; value: number; onValue: (n: number) => void }) {
  return <Field label={label}><input {...props} className="audit-input" type="number" value={Number.isFinite(value) ? value : ""} onChange={e => {
    if (e.target.value === "") return;
    const n = Number(e.target.value); if (Number.isFinite(n) && (props.min === undefined || n >= Number(props.min)) && (props.max === undefined || n <= Number(props.max))) onValue(n);
  }} /></Field>;
}
