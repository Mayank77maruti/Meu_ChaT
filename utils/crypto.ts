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
  const privateKeyString = await window.crypto.subtle.exportKey("jwk", keyPair.privateKey);
  return { publicKey: keyPair.publicKey, privateKey: privateKeyString };
}

export { generateKeyPair };