import { Purchases } from '@revenuecat/purchases-capacitor';
import { Capacitor } from '@capacitor/core';
import { supabase } from '../supabaseClient';
import { useStore } from '../store';

export const initRevenueCat = async () => {
  if (Capacitor.isNativePlatform()) {
    try {
      const apiKey = Capacitor.getPlatform() === 'ios' ? 'appl_YOUR_KEY' : 'goog_YOUR_KEY';
      await Purchases.configure({ apiKey });
      
      const userId = useStore.getState().userId;
      if (userId) {
        await Purchases.logIn({ appUserID: userId });
      }
    } catch (e) {
      console.warn("RevenueCat init failed", e);
    }
  }
};

export const buyTokens = async (packageId: string) => {
  if (!Capacitor.isNativePlatform()) {
    alert("In-App Purchases are only available on mobile.");
    return false;
  }
  
  try {
    const offerings = await Purchases.getOfferings();
    const pkg = offerings.current?.availablePackages.find(p => p.identifier === packageId);
    if (!pkg) throw new Error("Package not found");
    
    const { customerInfo } = await Purchases.purchasePackage({ aPackage: pkg });
    
    // Check if entitlement 'tokens' is active
    if (typeof customerInfo.entitlements.active['tokens'] !== "undefined") {
      // Logic to update Supabase tokens would go here or be handled via RevenueCat webhooks
      return true;
    }
    return false;
  } catch (e: any) {
    if (!e.userCancelled) {
      console.error("Purchase failed", e);
    }
    return false;
  }
};
