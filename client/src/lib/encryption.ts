import nacl from "tweetnacl";

const PRIVATE_KEY_STORAGE_KEY = "normie_private_key";

export function base64ToUint8Array(base64: string): Uint8Array {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

export function uint8ArrayToBase64(bytes: Uint8Array): string {
  let binaryString = "";
  for (let i = 0; i < bytes.length; i++) {
    binaryString += String.fromCharCode(bytes[i]);
  }
  return btoa(binaryString);
}

export interface KeyPair {
  publicKey: string;
  privateKey: Uint8Array;
}

export function generateKeyPair(): KeyPair {
  const keyPair = nacl.box.keyPair();
  return {
    publicKey: uint8ArrayToBase64(keyPair.publicKey),
    privateKey: keyPair.secretKey,
  };
}

export function getStoredPrivateKey(): Uint8Array | null {
  try {
    const stored = localStorage.getItem(PRIVATE_KEY_STORAGE_KEY);
    if (!stored) return null;
    return base64ToUint8Array(stored);
  } catch {
    return null;
  }
}

export function storePrivateKey(privateKey: Uint8Array): void {
  const base64 = uint8ArrayToBase64(privateKey);
  localStorage.setItem(PRIVATE_KEY_STORAGE_KEY, base64);
}

export function clearPrivateKey(): void {
  localStorage.removeItem(PRIVATE_KEY_STORAGE_KEY);
}

export function hasStoredPrivateKey(): boolean {
  return localStorage.getItem(PRIVATE_KEY_STORAGE_KEY) !== null;
}

export interface EncryptedMessage {
  encrypted: string;
  nonce: string;
}

export function encryptMessage(
  message: string,
  recipientPublicKey: string,
  senderPrivateKey: Uint8Array
): EncryptedMessage {
  const messageBytes = new TextEncoder().encode(message);
  const nonce = nacl.randomBytes(nacl.box.nonceLength);
  const recipientPubKeyBytes = base64ToUint8Array(recipientPublicKey);

  const encrypted = nacl.box(
    messageBytes,
    nonce,
    recipientPubKeyBytes,
    senderPrivateKey
  );

  return {
    encrypted: uint8ArrayToBase64(encrypted),
    nonce: uint8ArrayToBase64(nonce),
  };
}

export function decryptMessage(
  encrypted: string,
  nonce: string,
  senderPublicKey: string,
  recipientPrivateKey: Uint8Array
): string | null {
  try {
    const encryptedBytes = base64ToUint8Array(encrypted);
    const nonceBytes = base64ToUint8Array(nonce);
    const senderPubKeyBytes = base64ToUint8Array(senderPublicKey);

    const decrypted = nacl.box.open(
      encryptedBytes,
      nonceBytes,
      senderPubKeyBytes,
      recipientPrivateKey
    );

    if (!decrypted) {
      return null;
    }

    return new TextDecoder().decode(decrypted);
  } catch {
    return null;
  }
}

export function generatePublicKeyFromPrivate(privateKey: Uint8Array): string {
  const keyPair = nacl.box.keyPair.fromSecretKey(privateKey);
  return uint8ArrayToBase64(keyPair.publicKey);
}
