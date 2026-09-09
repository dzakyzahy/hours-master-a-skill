import { Purchases } from '@revenuecat/purchases-capacitor';
import { Capacitor } from '@capacitor/core';
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
    
    // =======================================================================
    // 🔒 KEAMANAN PEMBAYARAN (SECURITY ENFORCEMENT)
    // =======================================================================
    // PENTING: Jangan pernah menambahkan saldo atau membuka fitur premium
    // secara langsung melalui request dari client (frontend) ke database!
    // Client-side bisa di-hack/dimanipulasi (misal: modifikasi respon API).
    // 
    // CARA AMAN (REVENUECAT WEBHOOKS):
    // 1. RevenueCat memverifikasi resi pembayaran ke Apple/Google secara aman.
    // 2. RevenueCat mengirimkan WEBHOOK ke backend kita (Supabase Edge Function).
    // 3. Backend (Edge Function) yang mengupdate database tabel `profiles`
    //    secara tertutup (tanpa campur tangan client).
    // 
    // Cek di bawah ini hanya digunakan untuk memperbarui status UI saja.
    // =======================================================================
    
    if (typeof customerInfo.entitlements.active['tokens'] !== "undefined") {
      // Pembelian berhasil diverifikasi oleh server RevenueCat.
      // Tunggu webhook backend mengupdate Supabase, lalu refresh UI.
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
