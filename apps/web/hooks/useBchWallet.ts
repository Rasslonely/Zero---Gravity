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
      const secp256k1 = await instantiateSecp256k1();
      const sha256 = await instantiateSha256();
      const ripemd160 = await instantiateRipemd160();

      // Generate a rapid random private key
      const privateKey = crypto.getRandomValues(new Uint8Array(32));
      
      // Derive public key -> hash -> cash address
      const publicKey = secp256k1.derivePublicKeyCompressed(privateKey);
      if (typeof publicKey === 'string') throw new Error(publicKey); // Libauth returns string on err
      
      const pubKeyHash = ripemd160.hash(sha256.hash(publicKey));
      
      // Standard P2PKH type = 0
      const cashAddress = encodeCashAddress({ prefix: 'bchtest', type: 'p2pkh', payload: pubKeyHash });
      if (typeof cashAddress !== 'string') throw new Error('Failed to encode cashaddr');

      localStorage.setItem('0g_burner_address', cashAddress);
      // In a real scenario, we'd also store the private key (encrypted) to sign txs 
      // but for "shadow swipe", the covenant releases TO this address. So we only need the address.
      
      setBurnerAddress(cashAddress);
    } catch (err) {
      console.error("Burner init failed:", err);
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
