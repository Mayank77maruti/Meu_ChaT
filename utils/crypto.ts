// utils/crypto.ts

async function generateKeyPair() {
  const keyPair = await window.crypto.subtle.generateKey(
    {
      name: "RSA-OAEP",
      modulusLength: 2048, // or 4096
      publicExponent: new Uint8Array([0x01, 0x00, 0x01]),
      hash: "SHA-256",
    },
    true, // extractable
    ["encrypt", "decrypt"]
  );
  const privateKeyJwk = await window.crypto.subtle.exportKey("jwk", keyPair.privateKey);
  const publicKeyJwk = await window.crypto.subtle.exportKey("jwk", keyPair.publicKey);
  return { 
    publicKey: publicKeyJwk, 
    privateKey: privateKeyJwk 
  };
}

async function importPublicKey(publicKeyJwk: any) {
  return window.crypto.subtle.importKey(
    "jwk",
    publicKeyJwk,
    {
      name: "RSA-OAEP",
      hash: "SHA-256",
    },
    true,
    ["encrypt"]
  );
}

async function importPrivateKey(privateKeyJwk: any) {
  return window.crypto.subtle.importKey(
    "jwk",
    privateKeyJwk,
    {
      name: "RSA-OAEP",
      hash: "SHA-256",
    },
    true,
    ["decrypt"]
  );
}

async function encryptMessage(message: string, publicKeyJwk: any): Promise<string> {
  const publicKey = await importPublicKey(publicKeyJwk);
  const encoder = new TextEncoder();
  const messageBytes = encoder.encode(message);
  
  const encryptedBytes = await window.crypto.subtle.encrypt(
    {
      name: "RSA-OAEP"
    },
    publicKey,
    messageBytes
  );
  
  return btoa(String.fromCharCode(...new Uint8Array(encryptedBytes)));
}

async function decryptMessage(encryptedMessage: string, privateKeyJwk: any): Promise<string> {
  const privateKey = await importPrivateKey(privateKeyJwk);
  const encryptedBytes = Uint8Array.from(atob(encryptedMessage), c => c.charCodeAt(0));
  
  const decryptedBytes = await window.crypto.subtle.decrypt(
    {
      name: "RSA-OAEP"
    },
    privateKey,
    encryptedBytes
  );
  
  const decoder = new TextDecoder();
  return decoder.decode(decryptedBytes);
}

export { generateKeyPair, encryptMessage, decryptMessage };