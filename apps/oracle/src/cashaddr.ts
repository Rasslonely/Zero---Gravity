/**
 * ═══════════════════════════════════════════════════════
 * ZERO-GRAVITY: CashAddr → HASH160 Decoder
 * ═══════════════════════════════════════════════════════
 *
 * Decodes a BCH CashAddr (bchtest:q... or bitcoincash:q...)
 * into the 20-byte HASH160 payload needed by the ShadowCard
 * covenant's `recipientHash` field.
 *
 * Uses @bitauth/libauth — the same library used for signing.
 * Supports both mainnet (bitcoincash:) and chipnet (bchtest:) prefixes.
 */

import {
  decodeCashAddress,
  CashAddressType,
  binToHex,
} from '@bitauth/libauth';

/**
 * Decode a CashAddr string into its raw 20-byte HASH160 payload.
 *
 * @param address - Full CashAddr (e.g. "bchtest:qz8l29gfp...")
 * @returns 20-byte Uint8Array (HASH160)
 * @throws If the address is invalid, not P2PKH, or payload is wrong length
 */
export function decodeCashAddr(address: string): Uint8Array {
  const result = decodeCashAddress(address);

  if (typeof result === 'string') {
    throw new Error(`Invalid CashAddr "${address}": ${result}`);
  }

  // We only support P2PKH recipients (type = 0 = CashAddressType.p2pkh)
  // P2SH (type = 1) would need different locking bytecode construction
  if (result.type !== CashAddressType.p2pkh) {
    // For the covenant output, we need a P2PKH hash for LockingBytecodeP2PKH.
    // P2SH32 (type 3 in newer specs) or P2SH (type 1) won't work with our
    // covenant's `new LockingBytecodeP2PKH(recipientHash)` enforcement.
    //
    // However, we can still accept P2PKH which is the standard for user wallets.
    throw new Error(
      `Unsupported CashAddr type: expected P2PKH (type 0), got type ${result.type}. ` +
      `ShadowCard covenant only supports P2PKH recipients.`
    );
  }

  const payload = result.payload;
  if (payload.length !== 20) {
    throw new Error(
      `Invalid payload length: expected 20 bytes (HASH160), got ${payload.length}`
    );
  }

  return payload;
}

/**
 * Check if a string looks like a raw 40-char hex hash (already HASH160).
 */
export function isRawHash160(input: string): boolean {
  return /^[0-9a-fA-F]{40}$/.test(input);
}

/**
 * Resolve a recipient string to a 20-byte HASH160.
 * Handles both raw hex hashes and CashAddr strings.
 *
 * @param recipient - Either a 40-char hex hash or a CashAddr string
 * @returns 20-byte Uint8Array
 */
export function resolveRecipientHash(recipient: string): Uint8Array {
  if (isRawHash160(recipient)) {
    // Already a hex hash — convert to bytes
    const bytes = new Uint8Array(20);
    for (let i = 0; i < 20; i++) {
      bytes[i] = parseInt(recipient.substring(i * 2, i * 2 + 2), 16);
    }
    return bytes;
  }

  // Must be a CashAddr — decode it
  return decodeCashAddr(recipient);
}
