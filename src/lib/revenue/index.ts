import { Platform } from 'react-native';
import Purchases, { LOG_LEVEL } from 'react-native-purchases';

const RC_IOS_KEY     = 'appl_tu_key_aqui'
const RC_ANDROID_KEY = 'goog_tu_key_aqui'
const PRO_ENTITLEMENT = 'pro'

export function initRevenueCat(userId?: string) {
  Purchases.setLogLevel(LOG_LEVEL.DEBUG)
  const apiKey = Platform.OS === 'ios' ? RC_IOS_KEY : RC_ANDROID_KEY
  Purchases.configure({ apiKey, appUserID: userId ?? null })
}

export async function checkProAccess(): Promise<boolean> {
  try {
    const info = await Purchases.getCustomerInfo()
    return PRO_ENTITLEMENT in info.entitlements.active
  } catch {
    return false
  }
}

export async function purchasePro(): Promise<boolean> {
  try {
    const offerings = await Purchases.getOfferings()
    const pkg = offerings.current?.availablePackages[0]
    if (!pkg) return false
    const { customerInfo } = await Purchases.purchasePackage(pkg)
    return PRO_ENTITLEMENT in customerInfo.entitlements.active
  } catch (e: unknown) {
    if ((e as { userCancelled?: boolean }).userCancelled) return false
    throw e
  }
}

export async function restorePurchases(): Promise<boolean> {
  try {
    const info = await Purchases.restorePurchases()
    return PRO_ENTITLEMENT in info.entitlements.active
  } catch {
    return false
  }
}