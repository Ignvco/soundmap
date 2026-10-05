// WizardContext — signals to a nested page that it is being rendered inside
// the Design Wizard, so it can hide its own outer chrome (page headers, step
// pills, "min-h-screen" wrappers) and let the wizard shell own that layout.
import { createContext, useContext } from "react";

export const WizardContext = createContext<boolean>(false);

export function useInWizard(): boolean {
  return useContext(WizardContext);
}
