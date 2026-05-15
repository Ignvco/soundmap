// Todo gratuito — sin RevenueCat activo
// Cuando monetices: reemplazar con la implementación real

export async function checkProAccess(): Promise<boolean> {
  return true // siempre true = acceso completo
}

export async function purchasePro(): Promise<boolean> {
  return true
}

export async function restorePurchases(): Promise<boolean> {
  return true
}

export function initRevenueCat(_userId?: string): void {
  // no-op
}