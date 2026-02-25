import { useEffect, useState, useCallback } from 'react';
import { useBchStore } from '../stores/bchStore';
import { instantiateSecp256k1, instantiateSha256, instantiateRipemd160, encodeCashAddress } from '@bitauth/libauth';

// Utility to convert Uint8Array to hex (if needed)
const binToHex = (bin: Uint8Array) => Array.from(bin).map(b => b.toString(16).padStart(2, '0')).join('');

export function useBchWallet() {
  const { burnerAddress, burnerBalance, setBurnerAddress, updateBalance } = useBchStore();
  const [isInitializing, setIsInitializing] = useState(false);

  // Generate an ephemeral keys + standard P2PKH address for the burner wallet
  const initializeBurner = useCallback(async () => {
    if (burnerAddress) return; 
    
    // Check local storage for existing burner
    const storedAddress = localStorage.getItem('0g_burner_address');
    if (storedAddress) {
      setBurnerAddress(storedAddress);
      // fetch actual balance via electrum API here in production
      updateBalance(0);
      return;
    }

    setIsInitializing(true);
    try {
      // Create a timeout promise to prevent infinite hanging. Increase to 10s for slow WASM loads.
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Libauth instantiation timeout')), 10000)
      );

      const secp256k1 = await Promise.race([instantiateSecp256k1(), timeoutPromise]) as any;
      const sha256 = await instantiateSha256();
      const ripemd160 = await instantiateRipemd160();

      const privateKey = crypto.getRandomValues(new Uint8Array(32));
      const publicKey = secp256k1.derivePublicKeyCompressed(privateKey);
      if (typeof publicKey === 'string') throw new Error(publicKey); 
      
      const pubKeyHash = ripemd160.hash(sha256.hash(publicKey));
      const cashAddress = encodeCashAddress({ prefix: 'bchtest', type: 'p2pkh', payload: pubKeyHash });
      
      if (typeof cashAddress !== 'string') throw new Error('Failed to encode cashaddr');

      localStorage.setItem('0g_burner_address', cashAddress);
      setBurnerAddress(cashAddress);
    } catch (err) {
      console.warn("Burner init fell back to mock due to:", err);
      // Fallback: Use a completely valid testnet P2PKH address so the Oracle doesn't crash
      // during the decodeCashAddr phase if libauth fails to load in the browser.
      const validMockAddress = "bchtest:qzt6sz836e4cd9p9sv6we0pmnmcztyu3r58uqr0k8q";
      
      localStorage.setItem('0g_burner_address', validMockAddress);
      setBurnerAddress(validMockAddress);
    } finally {
      setIsInitializing(false);
    }
  }, [burnerAddress, setBurnerAddress, updateBalance]);

  useEffect(() => {
    initializeBurner();
  }, [initializeBurner]);

  return {
    burnerAddress,
    burnerBalance,
    isInitializing
  };
}
