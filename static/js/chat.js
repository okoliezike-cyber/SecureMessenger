let unlockedPrivateKey = null;
let messageRefreshInterval = null;
// Convert bytes to Base64
function toBase64(bytes) {
    return btoa(String.fromCharCode(...new Uint8Array(bytes)));
}

// Convert Base64 to bytes
function fromBase64(base64) {
    return Uint8Array.from(atob(base64), char => char.charCodeAt(0));
}

// Generate a random AES-256 key
async function generateMessageKey() {
    return await crypto.subtle.generateKey(
        {
            name: "AES-GCM",
            length: 256
        },
        true,
        ["encrypt", "decrypt"]
    );
}

// Encrypt a message using AES-GCM
async function encryptMessage(message, key) {
    const nonce = crypto.getRandomValues(new Uint8Array(12));

    const encrypted = await crypto.subtle.encrypt(
        {
            name: "AES-GCM",
            iv: nonce
        },
        key,
        new TextEncoder().encode(message)
    );

    return {
        encrypted_message: toBase64(encrypted),
        nonce: toBase64(nonce)
    };
}

// Select a user
function selectUser(userId, username) {
    document.getElementById("chat-area").style.display = "block";

    document.getElementById("chat-heading").textContent =
        "Chat with " + username;

    document.getElementById("message-input").dataset.receiverId = userId;
}


// Import a recipient's public key
async function importPublicKey(base64Key) {
    const keyData = fromBase64(base64Key);

    return await crypto.subtle.importKey(
        "spki",
        keyData,
        {
            name: "RSA-OAEP",
            hash: "SHA-256"
        },
        true,
        ["encrypt"]
    );
}

// Encrypt the AES message key with the recipient's public key
async function encryptMessageKey(messageKey, publicKey) {
    const rawKey = await crypto.subtle.exportKey("raw", messageKey);

    const encryptedKey = await crypto.subtle.encrypt(
        {
            name: "RSA-OAEP"
        },
        publicKey,
        rawKey
    );

    return toBase64(encryptedKey);
}


async function derivePrivateKey(password, saltBase64) {
    const passwordBytes = new TextEncoder().encode(password);
    const salt = fromBase64(saltBase64);

    const passwordKey = await crypto.subtle.importKey(
        "raw",
        passwordBytes,
        "PBKDF2",
        false,
        ["deriveKey"]
    );

    return await crypto.subtle.deriveKey(
        {
            name: "PBKDF2",
            salt: salt,
            iterations: 600000,
            hash: "SHA-256"
        },
        passwordKey,
        {
            name: "AES-GCM",
            length: 256
        },
        false,
        ["decrypt"]
    );
}


async function unlockPrivateKey(
    encryptedPrivateKey,
    password,
    salt,
    iv
) {
    const protectionKey = await derivePrivateKey(password, salt);

    const decryptedKey = await crypto.subtle.decrypt(
        {
            name: "AES-GCM",
            iv: fromBase64(iv)
        },
        protectionKey,
        fromBase64(encryptedPrivateKey)
    );

    return await crypto.subtle.importKey(
        "pkcs8",
        decryptedKey,
        {
            name: "RSA-OAEP",
            hash: "SHA-256"
        },
        false,
        ["decrypt"]
    );
}


async function decryptMessageKey(encryptedKey, privateKey) {
    const decryptedKey = await crypto.subtle.decrypt(
        {
            name: "RSA-OAEP"
        },
        privateKey,
        fromBase64(encryptedKey)
    );

    return await crypto.subtle.importKey(
        "raw",
        decryptedKey,
        {
            name: "AES-GCM"
        },
        false,
        ["decrypt"]
    );
}

async function decryptMessage(encryptedMessage, nonce, messageKey) {
    const decrypted = await crypto.subtle.decrypt(
        {
            name: "AES-GCM",
            iv: fromBase64(nonce)
        },
        messageKey,
        fromBase64(encryptedMessage)
    );

    return new TextDecoder().decode(decrypted);
}


async function sendMessage() {
    const input = document.getElementById("message-input");
    const message = input.value.trim();
    const receiverId = input.dataset.receiverId;

    if (!message || !receiverId) {
        alert("Select a user and enter a message.");
        return;
    }

    if (!unlockedPrivateKey) {
        alert("Unlock your messages before sending.");
        return;
    }

    try {
        // Generate a temporary AES key
        const messageKey = await generateMessageKey();

        // Encrypt the message
        const encrypted = await encryptMessage(message, messageKey);

        // Get recipient's public key
        const response = await fetch(`/public-key/${receiverId}`);

        if (!response.ok) {
            throw new Error("Could not retrieve recipient's public key.");
        }

        const receiver = await response.json();

        const receiverPublicKey = await importPublicKey(
            receiver.public_key
        );

        // Encrypt AES key for receiver
        const receiverEncryptedKey = await encryptMessageKey(
            messageKey,
            receiverPublicKey
        );

        // Get sender's public key
        const senderResponse = await fetch(
            `/public-key/${CURRENT_USER_ID}`
        );

        if (!senderResponse.ok) {
            throw new Error("Could not retrieve your public key.");
        }

        const sender = await senderResponse.json();

        const senderPublicKey = await importPublicKey(
            sender.public_key
        );

        // Encrypt AES key for sender
        const senderEncryptedKey = await encryptMessageKey(
            messageKey,
            senderPublicKey
        );

        // Send encrypted data to Flask
        const result = await fetch("/send-message", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                receiver_id: receiverId,
                encrypted_message: encrypted.encrypted_message,
                nonce: encrypted.nonce,
                receiver_encrypted_key: receiverEncryptedKey,
                sender_encrypted_key: senderEncryptedKey
            })
        });

        const data = await result.json();

        if (!result.ok) {
            throw new Error(data.error || "Message sending failed.");
        }

        alert("Encrypted message sent successfully!");

input.value = "";

await loadMessages();

    } catch (error) {
        console.error(error);
        alert(error.message);
    }
}



async function loadMessages() {
    const inbox = document.getElementById("inbox");

    try {
        const response = await fetch("/messages");

        if (!response.ok) {
            throw new Error("Could not load messages.");
        }

        const data = await response.json();

        inbox.replaceChildren();

        if (data.messages.length === 0) {
            inbox.textContent = "No messages yet.";
            return;
        }

        for (const message of data.messages) {

            const messageRow = document.createElement("div");
           messageRow.className = message.is_sent
    ? "message-row sent"
    : "message-row received";

            const bubble = document.createElement("div");
            bubble.className = "message-bubble";

            const sender = document.createElement("strong");
            sender.className = "message-sender";
            sender.textContent = message.sender_username;

            const content = document.createElement("p");
            content.className = "message-content";

            if (!unlockedPrivateKey) {
                content.textContent = "Unlock your messages to read.";
            } else {
                try {
                    const messageKey = await decryptMessageKey(
                        message.receiver_encrypted_key,
                        unlockedPrivateKey
                    );

                    const plaintext = await decryptMessage(
                        message.encrypted_message,
                        message.nonce,
                        messageKey
                    );

                    content.textContent = plaintext;

                } catch (error) {
                    content.textContent = "Unable to decrypt this message.";
                    console.error("Decryption error:", error);
                }
            }

            const timestamp = document.createElement("small");
            timestamp.className = "message-time";

            if (message.created_at) {
                const date = new Date(message.created_at);
                timestamp.textContent = isNaN(date.getTime())
                    ? ""
                    : date.toLocaleString();
            }

            bubble.append(sender, content, timestamp);
            messageRow.appendChild(bubble);
            inbox.appendChild(messageRow);
        }

    } catch (error) {
        console.error(error);
        inbox.textContent = "Unable to load messages.";
    }
}

async function unlockMyMessages() {
    const password = document.getElementById(
        "private-key-password"
    ).value;

    const status = document.getElementById("unlock-status");

    if (!password) {
        status.textContent = "Please enter your password.";
        return;
    }

    try {
        status.textContent = "Unlocking your private key...";

        const response = await fetch("/my-private-key");

        if (!response.ok) {
            throw new Error("Could not retrieve your private key.");
        }

        const data = await response.json();

        unlockedPrivateKey = await unlockPrivateKey(
            data.encrypted_private_key,
            password,
            data.salt,
            data.iv
        );

        status.textContent = "Private key unlocked successfully!";

        // Load messages immediately
        await loadMessages();

        // Stop any previous refresh timer
        if (messageRefreshInterval !== null) {
            clearInterval(messageRefreshInterval);
        }

        // Automatically refresh messages every 5 seconds
        messageRefreshInterval = setInterval(() => {
            loadMessages();
        }, 5000);

    } catch (error) {
        console.error(error);
        unlockedPrivateKey = null;

        status.textContent =
            "Unable to unlock. Check your password and try again.";
    }
}