import nacl from "tweetnacl";

const ENCRYPTED_KEY_STORAGE = "normie_encrypted_key";
const KEY_SALT_STORAGE = "normie_key_salt";
const LEGACY_KEY_STORAGE = "normie_private_key";

let cachedPrivateKey: Uint8Array | null = null;

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

async function getOrCreateWrappingKey(): Promise<CryptoKey> {
  let saltB64 = localStorage.getItem(KEY_SALT_STORAGE);
  let salt: Uint8Array;
  
  if (!saltB64) {
    salt = crypto.getRandomValues(new Uint8Array(16));
    localStorage.setItem(KEY_SALT_STORAGE, uint8ArrayToBase64(salt));
  } else {
    salt = base64ToUint8Array(saltB64);
  }
  
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(window.location.origin + navigator.userAgent),
    "PBKDF2",
    false,
    ["deriveKey"]
  );
  
  return crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt,
      iterations: 100000,
      hash: "SHA-256",
    },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
}

async function encryptPrivateKey(privateKey: Uint8Array): Promise<string> {
  const wrappingKey = await getOrCreateWrappingKey();
  const iv = crypto.getRandomValues(new Uint8Array(12));
  
  const encrypted = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    wrappingKey,
    privateKey
  );
  
  const combined = new Uint8Array(iv.length + encrypted.byteLength);
  combined.set(iv, 0);
  combined.set(new Uint8Array(encrypted), iv.length);
  
  return uint8ArrayToBase64(combined);
}

async function decryptPrivateKey(encryptedB64: string): Promise<Uint8Array | null> {
  try {
    const combined = base64ToUint8Array(encryptedB64);
    const iv = combined.slice(0, 12);
    const encrypted = combined.slice(12);
    
    const wrappingKey = await getOrCreateWrappingKey();
    
    const decrypted = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv },
      wrappingKey,
      encrypted
    );
    
    return new Uint8Array(decrypted);
  } catch {
    return null;
  }
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
  return cachedPrivateKey;
}

export async function initializeEncryptionKeys(): Promise<Uint8Array | null> {
  if (cachedPrivateKey) return cachedPrivateKey;
  
  const legacyKey = localStorage.getItem(LEGACY_KEY_STORAGE);
  if (legacyKey) {
    const privateKey = base64ToUint8Array(legacyKey);
    await storePrivateKey(privateKey);
    localStorage.removeItem(LEGACY_KEY_STORAGE);
    cachedPrivateKey = privateKey;
    return privateKey;
  }
  
  const encryptedKey = localStorage.getItem(ENCRYPTED_KEY_STORAGE);
  if (encryptedKey) {
    cachedPrivateKey = await decryptPrivateKey(encryptedKey);
    return cachedPrivateKey;
  }
  
  return null;
}

export async function storePrivateKey(privateKey: Uint8Array): Promise<void> {
  const encrypted = await encryptPrivateKey(privateKey);
  localStorage.setItem(ENCRYPTED_KEY_STORAGE, encrypted);
  cachedPrivateKey = privateKey;
}

export function clearPrivateKey(): void {
  localStorage.removeItem(ENCRYPTED_KEY_STORAGE);
  localStorage.removeItem(KEY_SALT_STORAGE);
  localStorage.removeItem(LEGACY_KEY_STORAGE);
  cachedPrivateKey = null;
}

export function hasStoredPrivateKey(): boolean {
  return cachedPrivateKey !== null || 
    localStorage.getItem(ENCRYPTED_KEY_STORAGE) !== null ||
    localStorage.getItem(LEGACY_KEY_STORAGE) !== null;
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
