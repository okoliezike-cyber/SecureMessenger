# Secure Messenger

Secure Messenger is a cybersecurity project developed to demonstrate secure communication between users through cryptographic encryption and decryption.

The platform uses Python Flask, MySQL, JavaScript, and the Web Crypto API to protect messages exchanged between users.

## Features

- User registration and login.
- Secure password hashing.
- RSA public/private key generation.
- Encrypted private key storage.
- AES-256-GCM message encryption.
- RSA-OAEP encryption of AES message keys.
- Unique encryption nonce (IV) for every message.
- Secure message sending and receiving.
- Sender and recipient message decryption.
- Automatic message refreshing.
- Chat interface with message history.
- Live encryption and decryption demonstration.

## Technologies Used

- **Backend:** Python and Flask.
- **Database:** MySQL.
- **Frontend:** HTML, CSS and JavaScript.
- **Cryptographic API:** JavaScript Web Crypto API.
- **Symmetric Encryption:** AES-256-GCM.
- **Asymmetric Encryption:** RSA-OAEP with SHA-256.
- **Password-Based Key Derivation:** PBKDF2 with SHA-256.

## How the Encryption Process Works

1. A user registers and the application generates an RSA public/private key pair.
2. The private key is encrypted using a password-derived AES key.
3. When a user sends a message, the application generates a temporary AES-256-GCM key.
4. The original message is encrypted using the AES key and a randomly generated 12-byte nonce.
5. The AES key is encrypted using the recipient's RSA public key.
6. Another copy of the AES key is encrypted using the sender's RSA public key.
7. The encrypted message, nonce and encrypted AES keys are sent to the Flask server.
8. The encrypted information is stored in the MySQL database.
9. The recipient unlocks their private key and uses it to recover the AES key.
10. The recovered AES key is used to decrypt and display the original message.

The sender can also decrypt their sent messages using their own encrypted copy of the AES key.

## Live Encryption Demonstration

The application includes an educational demonstration panel that displays the encryption process when a message is sent.

It displays:

- Original message.
- Encrypted message (ciphertext).
- Encryption algorithm.
- Generated AES encryption key.
- Encryption nonce (IV).

This allows users to observe how readable messages are converted into ciphertext before being transmitted.

## Live Decryption Demonstration

The application also demonstrates how encrypted messages are recovered.

It displays:

- Encrypted message.
- Recovered AES key.
- Decrypted original message.
- Decryption status.

This demonstrates how the recipient uses their private key to recover the AES message key and decrypt the original message.

## Database and Message Storage

The application uses MySQL to store user account information, public keys and encrypted messages.

Message records contain encrypted message content, the nonce, the recipient's encrypted AES key and the sender's encrypted AES key.

## Installation and Setup

### 1. Clone the Repository

```bash
git clone https://github.com/okoliezike-cyber/SecureMessenger.git
cd SecureMessenger
```

### 2. Create a Virtual Environment

```bash
python -m venv .venv
```

### 3. Activate the Virtual Environment

For Windows PowerShell:

```powershell
.venv\Scripts\Activate
```

### 4. Install Dependencies

```bash
pip install -r requirements.txt
```

### 5. Set Up the Database

- Start your MySQL server.
- Create a database named `secure_messenger`.
- Import the `schema.sql` file using phpMyAdmin or MySQL.
- Check the database connection settings in `app.py`.

### 6. Run the Application

```bash
python app.py
```

### 7. Open the Application

Visit:

```text
http://127.0.0.1:5000
```

Create two user accounts to test encrypted communication between users.

## Security Considerations

Secure Messenger is an educational cybersecurity prototype designed to demonstrate encryption, decryption and cryptographic key management.

The demonstration panel displays the AES encryption key for educational purposes. In a production application, this key must never be exposed in the user interface or logs.

The project has not undergone an independent security audit. Production deployment would require HTTPS, secure configuration, improved session management, key lifecycle protection and additional security testing.

## Project Objective

The objective of Secure Messenger is to demonstrate how cryptographic algorithms can protect communication between users by encrypting messages, securely protecting encryption keys and allowing authorized users to decrypt messages.

**Project Name:** Secure Messenger

**Category:** Cybersecurity / Secure Communication