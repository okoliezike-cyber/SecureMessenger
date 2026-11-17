# Secure Messenger

A secure messaging platform built with Python Flask, MySQL, and JavaScript Web Crypto API. The application demonstrates how encryption protects messages during communication between two users.

## Features

- User registration and login
- Secure password hashing
- Encrypted private key storage
- RSA public/private key generation
- AES-256-GCM message encryption
- RSA-OAEP key encryption
- Sending and receiving encrypted messages
- Sender and receiver message decryption
- Automatic message refreshing
- Chat interface with message history

## Technologies Used

- **Backend:** Python, Flask
- **Database:** MySQL
- **Frontend:** HTML, CSS, JavaScript
- **Cryptography:** Web Crypto API
- **Encryption:** AES-256-GCM and RSA-OAEP
- **Password protection:** PBKDF2 with SHA-256

## How Encryption Works

1. A user creates an account and generates an RSA public/private key pair.
2. The private key is encrypted using a key derived from the user's password.
3. When a user sends a message, the application generates a new AES-256-GCM key.
4. The message is encrypted using the AES key.
5. The AES key is encrypted with the recipient's RSA public key and the sender's RSA public key.
6. The encrypted message and encrypted keys are sent to the Flask server and stored in MySQL.
7. The recipient unlocks their private key and decrypts the AES key.
8. The AES key is then used to decrypt and display the original message.

This allows both the sender and recipient to decrypt their respective copies of the message key.

## Installation and Setup

### 1. Clone the repository

```bash
git clone YOUR_GITHUB_REPOSITORY_URL
cd SecureMessenger
```

### 2. Create a virtual environment

```bash
python -m venv .venv
```

Activate it on Windows:

```powershell
.venv\Scripts\Activate
```

### 3. Install dependencies

```bash
pip install -r requirements.txt
```

### 4. Set up the database

- Start your MySQL server.
- Create the `secure_messenger` database.
- Import the `schema.sql` file using phpMyAdmin or MySQL.
- Check the database connection settings in `app.py`.

### 5. Run the application

```bash
python app.py
```

### 6. Open the application

Visit:

```text
http://127.0.0.1:5000
```

Create two accounts to test encrypted messaging between users.

## Security Notes

This project is an educational cybersecurity prototype demonstrating message encryption and key management.

It has not undergone an independent security audit. Production deployment requires additional security measures, including HTTPS, secure configuration, and further testing.

## Project Purpose

The purpose of this project is to demonstrate how cryptographic techniques can protect messages exchanged between users and how encrypted messages can be stored without exposing their original contents to the server.

---

**Project:** Secure Messenger  
**Category:** Cybersecurity / Secure Communication