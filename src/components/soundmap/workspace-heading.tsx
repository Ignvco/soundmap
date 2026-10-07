import type { ReactNode } from "react";

export function WorkspaceHeading({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow: string;
  title: string;
  description: string;
  children?: ReactNode;
}) {
  return (
    <header className="workspace-heading">
      <div>
        <p className="project-eyebrow">{eyebrow}</p>
        <h1>{title}</h1>
        <p className="workspace-description">{description}</p>
      </div>
      {children && <div className="workspace-actions">{children}</div>}
    </header>
  );
}
