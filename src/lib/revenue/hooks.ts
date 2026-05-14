import { useEffect, useState } from 'react';
import { checkProAccess } from './index';

export function useProAccess(): boolean {
  const [isPro, setIsPro] = useState(false)

  useEffect(() => {
    checkProAccess().then(setIsPro)
  }, [])

  return isPro
}

// Para desarrollo: siempre retorna true
export function useProAccessDev(): boolean {
  return true
}