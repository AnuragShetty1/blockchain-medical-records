import { ethers } from 'ethers';

// A static, predefined message that users will sign.
const SIGNATURE_MESSAGE = "Sign this message to generate and secure your MediLedger key. This will not cost any gas.";

// --- KEY MANAGEMENT ---

/**
 * Derives a deterministic AES-GCM key from a user's signature.
 * This key's ONLY purpose is to encrypt/decrypt the user's private key in local storage.
 * @param {ethers.Signer} signer - The user's wallet signer instance.
 * @returns {Promise<CryptoKey>} A key suitable for AES-GCM encryption.
 */
const getLocalStorageEncryptionKey = async (signer) => {
    const signature = await signer.signMessage(SIGNATURE_MESSAGE);
    const signatureBytes = ethers.toUtf8Bytes(signature);
    const hash = await window.crypto.subtle.digest('SHA-256', signatureBytes);
    return window.crypto.subtle.importKey('raw', hash, 'AES-GCM', true, ['encrypt', 'decrypt']);
};

/**
 * Generates a new P-256 key pair for elliptic curve cryptography and stores it securely.
 * @param {ethers.Signer} signer - The user's wallet signer instance.
 * @returns {Promise<{publicKey: string, privateKey: CryptoKey}>} The generated key pair.
 */
export const generateAndStoreKeyPair = async (signer) => {
    const keyPair = await window.crypto.subtle.generateKey(
        { name: 'ECDH', namedCurve: 'P-256' },
        true,
        ['deriveKey']
    );

    const publicKeyJwk = await window.crypto.subtle.exportKey('jwk', keyPair.publicKey);
    const publicKeyBase64 = window.btoa(JSON.stringify(publicKeyJwk));

    const privateKeyJwk = await window.crypto.subtle.exportKey('jwk', keyPair.privateKey);
    const privateKeyString = JSON.stringify(privateKeyJwk);
    const privateKeyBytes = new TextEncoder().encode(privateKeyString);

    const storageKey = await getLocalStorageEncryptionKey(signer);
    const iv = window.crypto.getRandomValues(new Uint8Array(12));
    const encryptedPrivateKey = await window.crypto.subtle.encrypt(
        { name: 'AES-GCM', iv },
        storageKey,
        privateKeyBytes
    );
    const userAddress = await signer.getAddress();
    localStorage.setItem(`encryptedPrivateKey-${userAddress}`, JSON.stringify({
        iv: Array.from(iv),
        data: Array.from(new Uint8Array(encryptedPrivateKey))
    }));
    localStorage.setItem(`publicKey-${userAddress}`, publicKeyBase64);

    return { publicKey: publicKeyBase64, privateKey: keyPair.privateKey };
};

/**
 * Loads the user's key pair from local storage.
 * @param {ethers.Signer} signer - The user's wallet signer instance.
 * @returns {Promise<{publicKey: string, privateKey: CryptoKey} | null>} The loaded key pair or null if not found.
 */
export const loadKeyPair = async (signer) => {
    if (!signer) return null;
    const userAddress = await signer.getAddress();
    const publicKey = localStorage.getItem(`publicKey-${userAddress}`);
    const encryptedKeyData = localStorage.getItem(`encryptedPrivateKey-${userAddress}`);

    if (!publicKey || !encryptedKeyData) {
        return null;
    }

    const { iv, data } = JSON.parse(encryptedKeyData);
    const ivArray = new Uint8Array(iv);
    const dataArray = new Uint8Array(data);

    try {
        const storageKey = await getLocalStorageEncryptionKey(signer);
        const decryptedPrivateKeyBytes = await window.crypto.subtle.decrypt(
            { name: 'AES-GCM', iv: ivArray },
            storageKey,
            dataArray
        );

        const privateKeyJwk = JSON.parse(new TextDecoder().decode(decryptedPrivateKeyBytes));
        const privateKey = await window.crypto.subtle.importKey(
            'jwk',
            privateKeyJwk,
            { name: 'ECDH', namedCurve: 'P-256' },
            true,
            ['deriveKey']
        );

        return { publicKey, privateKey };
    } catch (error) {
        console.error("Failed to decrypt private key:", error);
        return null;
    }
};

// --- HYBRID ENCRYPTION (ECIES IMPLEMENTATION) ---

/**
 * Encrypts data for multiple recipients using a standard ECIES approach.
 * @param {ArrayBuffer} data - The raw data to encrypt.
 * @param {string[]} recipientPublicKeysBase64 - An array of base64 encoded public keys.
 * @returns {Promise<Object>} A serializable object containing the encrypted bundle.
 */
export const hybridEncrypt = async (data, recipientPublicKeysBase64) => {
    const symmetricKey = await window.crypto.subtle.generateKey(
        { name: 'AES-GCM', length: 256 },
        true,
        ['encrypt', 'decrypt']
    );
    const iv = window.crypto.getRandomValues(new Uint8Array(12));
    const encryptedData = await window.crypto.subtle.encrypt(
        { name: 'AES-GCM', iv },
        symmetricKey,
        data
    );

    const encryptedSymmetricKeys = {};
    for (const publicKeyBase64 of recipientPublicKeysBase64) {
        const ephemeralKeyPair = await window.crypto.subtle.generateKey(
            { name: 'ECDH', namedCurve: 'P-256' },
            true,
            ['deriveKey']
        );

        const publicKeyJwk = JSON.parse(window.atob(publicKeyBase64));
        const recipientPublicKey = await window.crypto.subtle.importKey(
            'jwk', publicKeyJwk,
            { name: 'ECDH', namedCurve: 'P-256' },
            true, []
        );

        const sharedSecret = await window.crypto.subtle.deriveKey(
            { name: 'ECDH', public: recipientPublicKey },
            ephemeralKeyPair.privateKey,
            { name: 'AES-GCM', length: 256 },
            true, ['wrapKey', 'unwrapKey']
        );
        
        const wrappedKey = await window.crypto.subtle.wrapKey(
            'raw', symmetricKey, sharedSecret, { name: 'AES-GCM', iv: iv }
        );
        
        const ephemeralPublicKeyJwk = await window.crypto.subtle.exportKey('jwk', ephemeralKeyPair.publicKey);

        encryptedSymmetricKeys[publicKeyBase64] = {
            ephemeralPublicKey: ephemeralPublicKeyJwk,
            wrappedKey: Array.from(new Uint8Array(wrappedKey))
        };
    }

    return {
        iv: Array.from(iv),
        encryptedData: Array.from(new Uint8Array(encryptedData)),
        encryptedSymmetricKeys,
    };
};

/**
 * Decrypts data that was encrypted with the ECIES hybrid approach.
 * @param {Object} encryptedBundle - The object from hybridEncrypt.
 * @param {CryptoKey} userPrivateKey - The user's own private key.
 * @returns {Promise<ArrayBuffer>} The decrypted raw data.
 */
export const hybridDecrypt = async (encryptedBundle, userPrivateKey) => {
    const { iv, encryptedData, encryptedSymmetricKeys } = encryptedBundle;

    let symmetricKey;

    // Iterate through all possible keys for recipients.
    for (const pubKeyBase64 in encryptedSymmetricKeys) {
        try {
            const { ephemeralPublicKey, wrappedKey } = encryptedSymmetricKeys[pubKeyBase64];
            
            const ephemeralPubKey = await window.crypto.subtle.importKey(
                'jwk', ephemeralPublicKey,
                { name: 'ECDH', namedCurve: 'P-256' },
                true, []
            );

            // Derive the same shared secret using the ephemeral public key and our private key.
            const sharedSecret = await window.crypto.subtle.deriveKey(
                { name: 'ECDH', public: ephemeralPubKey },
                userPrivateKey,
                { name: 'AES-GCM', length: 256 },
                true, ['wrapKey', 'unwrapKey']
            );

            // "Unwrap" (decrypt) the symmetric data key.
            symmetricKey = await window.crypto.subtle.unwrapKey(
                'raw', new Uint8Array(wrappedKey), sharedSecret,
                { name: 'AES-GCM', iv: new Uint8Array(iv) },
                { name: 'AES-GCM', length: 256 },
                true, ['decrypt']
            );

            // If we successfully unwrapped a key, we've found our key. Break the loop.
            if (symmetricKey) break; 
        } catch (error) {
            // This error is expected if we are not the intended recipient of this specific key.
            // We log it for debugging but continue to the next key.
            // console.log(`Attempted to decrypt with key ${pubKeyBase64} and failed. This is normal if you are not the recipient for this key.`);
            continue;
        }
    }

    if (!symmetricKey) {
        throw new Error("Decryption failed: You are not a recipient of this file, or the data is corrupt.");
    }
    
    // Decrypt the main data bundle with the successfully unwrapped symmetric key.
    const decryptedData = await window.crypto.subtle.decrypt(
        { name: 'AES-GCM', iv: new Uint8Array(iv) },
        symmetricKey,
        new Uint8Array(encryptedData)
    );

    return decryptedData;
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

