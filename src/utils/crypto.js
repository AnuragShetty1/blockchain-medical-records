import { ethers } from 'ethers';

// A static, predefined message that users will sign to generate their key.
const SIGNATURE_MESSAGE = "Sign this message to generate your secure MediLedger encryption key. This will not cost any gas.";

/**
 * Generates a deterministic 256-bit AES-GCM encryption key from a user's wallet signature.
 */
export const getEncryptionKey = async (signer) => {
    const signature = await signer.signMessage(SIGNATURE_MESSAGE);
    const signatureBytes = ethers.toUtf8Bytes(signature);
    const hash = await window.crypto.subtle.digest('SHA-256', signatureBytes);
    return window.crypto.subtle.importKey('raw', hash, 'AES-GCM', true, ['encrypt', 'decrypt']);
};

/**
 * Encrypts file data using AES-256-GCM.
 */
export const encryptFile = async (fileData, key) => {
    const iv = window.crypto.getRandomValues(new Uint8Array(12)); // GCM standard IV size
    const encryptedData = await window.crypto.subtle.encrypt(
        { name: 'AES-GCM', iv: iv },
        key,
        fileData
    );
    return { encryptedData, iv };
};

/**
 * Decrypts file data using AES-256-GCM.
 */
export const decryptFile = async (encryptedData, key, iv) => {
    return window.crypto.subtle.decrypt(
        { name: 'AES-GCM', iv: iv },
        key,
        encryptedData
    );
};

// Helper function to convert a Base64 string back to a Uint8Array
export const base64ToUint8Array = (base64) => {
    const binaryString = window.atob(base64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes;
};

