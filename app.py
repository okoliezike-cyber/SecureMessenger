
from flask import (
    Flask, render_template, request,
    redirect, url_for, session, flash
)
import pymysql
import os
import base64
from werkzeug.security import (
    generate_password_hash,
    check_password_hash
)

app = Flask(__name__)
app.secret_key = os.environ.get(
    "FLASK_SECRET_KEY",
    "dev-only-change-this-secret"
)

# DATABASE CONNECTION
def get_db_connection():
    return pymysql.connect(
        host="localhost",
        user="root",
        password="",
        database="secure_messenger",
        cursorclass=pymysql.cursors.DictCursor
    )

# HOME PAGE
@app.route("/")
def home():
    if session.get("user_id"):
        return redirect(url_for("dashboard"))
    return redirect(url_for("login"))

# DATABASE TEST
@app.route("/db-test")
def db_test():
    try:
        connection = get_db_connection()

        with connection.cursor() as cursor:
            cursor.execute("SELECT COUNT(*) AS total FROM users")
            result = cursor.fetchone()

        connection.close()

        return f"Database connected successfully! Users: {result['total']}"

    except Exception as error:
        return f"Database connection failed: {error}", 500

# USER REGISTRATION
@app.route("/register", methods=["GET", "POST"])
def register():

    if request.method == "POST":

        username = request.form.get("username", "").strip()
        password = request.form.get("password", "")

        public_key = request.form.get("public_key")
        encrypted_private_key = request.form.get(
            "encrypted_private_key"
        )
        salt = request.form.get("salt")
        private_key_iv = request.form.get("private_key_iv")

        if not username or len(username) < 3:
            flash("Username must contain at least 3 characters.")
            return redirect(url_for("register"))

        if len(password) < 10:
            flash("Password must contain at least 10 characters.")
            return redirect(url_for("register"))

        if not all([
            public_key,
            encrypted_private_key,
            salt,
            private_key_iv
        ]):
            flash("Encryption key generation failed. Try again.")
            return redirect(url_for("register"))

        try:
            # Validate that submitted key data is valid Base64
            base64.b64decode(public_key, validate=True)
            base64.b64decode(encrypted_private_key, validate=True)
            base64.b64decode(salt, validate=True)
            base64.b64decode(private_key_iv, validate=True)

            password_hash = generate_password_hash(password)

            connection = get_db_connection()

            with connection.cursor() as cursor:

                cursor.execute(
                    "SELECT id FROM users WHERE username = %s",
                    (username,)
                )

                if cursor.fetchone():
                    flash("Username already exists.")
                    connection.close()
                    return redirect(url_for("register"))

                cursor.execute("""
                    INSERT INTO users (
                        username,
                        password_hash,
                        public_key,
                        encrypted_private_key,
                        salt,
                        private_key_iv
                    )
                    VALUES (%s, %s, %s, %s, %s, %s)
                """, (
                    username,
                    password_hash,
                    public_key,
                    encrypted_private_key,
                    salt,
                    private_key_iv
                ))

                connection.commit()
                user_id = cursor.lastrowid

            connection.close()

            session["user_id"] = user_id
            session["username"] = username

            flash("Account created successfully!")
            return redirect(url_for("dashboard"))

        except Exception as error:
            print("Registration error:", error)
            flash("Registration failed. Please try again.")

    return render_template("register.html")

# USER LOGIN
@app.route("/login", methods=["GET", "POST"])
def login():

    if request.method == "POST":

        username = request.form.get("username", "").strip()
        password = request.form.get("password", "")

        connection = get_db_connection()

        with connection.cursor() as cursor:
            cursor.execute(
                "SELECT * FROM users WHERE username = %s",
                (username,)
            )
            user = cursor.fetchone()

        connection.close()

        if user and check_password_hash(
            user["password_hash"], password
        ):
            session.clear()
            session["user_id"] = user["id"]
            session["username"] = user["username"]

            return redirect(url_for("dashboard"))

        flash("Invalid username or password.")

    return render_template("login.html")

# DASHBOARD
@app.route("/dashboard")
def dashboard():

    if "user_id" not in session:
        return redirect(url_for("login"))

    return render_template(
        "dashboard.html",
        username=session["username"]
    )


@app.route('/chat')
def chat():
    if 'user_id' not in session:
        return redirect(url_for('login'))

    connection = get_db_connection()

    try:
        with connection.cursor() as cursor:
            cursor.execute(
                "SELECT id, username FROM users WHERE id != %s",
                (session['user_id'],)
            )
            users = cursor.fetchall()

        return render_template('chat.html', users=users)

    finally:
        connection.close()


@app.route('/public-key/<int:user_id>')
def get_public_key(user_id):
    if 'user_id' not in session:
        return {'error': 'Not logged in'}, 401

    connection = get_db_connection()

    try:
        with connection.cursor() as cursor:
            cursor.execute(
                "SELECT public_key FROM users WHERE id = %s",
                (user_id,)
            )
            user = cursor.fetchone()

        if not user:
            return {'error': 'User not found'}, 404

        return {'public_key': user['public_key']}

    finally:
        connection.close()


@app.route('/send-message', methods=['POST'])
def send_message():
    if 'user_id' not in session:
        return {'error': 'Not logged in'}, 401

    data = request.get_json()

    if not data:
        return {'error': 'Invalid request'}, 400

    receiver_id = data.get('receiver_id')
    encrypted_message = data.get('encrypted_message')
    nonce = data.get('nonce')
    receiver_encrypted_key = data.get('receiver_encrypted_key')
    sender_encrypted_key = data.get('sender_encrypted_key')

    if not all([
        receiver_id,
        encrypted_message,
        nonce,
        receiver_encrypted_key,
        sender_encrypted_key
    ]):
        return {'error': 'Missing message data'}, 400

    connection = get_db_connection()

    try:
        with connection.cursor() as cursor:
            cursor.execute(
                """
                INSERT INTO messages (
                    sender_id,
                    receiver_id,
                    encrypted_message,
                    nonce,
                    receiver_encrypted_key,
                    sender_encrypted_key
                )
                VALUES (%s, %s, %s, %s, %s, %s)
                """,
                (
                    session['user_id'],
                    receiver_id,
                    encrypted_message,
                    nonce,
                    receiver_encrypted_key,
                    sender_encrypted_key
                )
            )

        connection.commit()

        return {
            'success': True,
            'message': 'Encrypted message saved'
        }

    except Exception:
        connection.rollback()
        app.logger.exception("Message storage failed")
        return {'error': 'Could not save message'}, 500

    finally:
        connection.close()


@app.route('/my-private-key')
def get_my_private_key():
    if 'user_id' not in session:
        return {'error': 'Not logged in'}, 401

    connection = get_db_connection()

    try:
        with connection.cursor() as cursor:
            cursor.execute(
                """
                SELECT encrypted_private_key, salt, private_key_iv
                FROM users
                WHERE id = %s
                """,
                (session['user_id'],)
            )

            user = cursor.fetchone()

        if not user:
            return {'error': 'User not found'}, 404

        return {
            'encrypted_private_key': user['encrypted_private_key'],
            'salt': user['salt'],
            'iv': user['private_key_iv']
        }

    finally:
        connection.close()


@app.route('/messages')
def get_messages():
    if 'user_id' not in session:
        return {'error': 'Not logged in'}, 401

    user_id = session['user_id']
    connection = get_db_connection()

    try:
        with connection.cursor() as cursor:
            cursor.execute(
                """
                SELECT
                    messages.id,
                    messages.sender_id,
                    messages.receiver_id,
                    sender.username AS sender_username,
                    receiver.username AS receiver_username,

                    messages.encrypted_message,
                    messages.nonce,

                    CASE
                        WHEN messages.sender_id = %s
                        THEN messages.sender_encrypted_key
                        ELSE messages.receiver_encrypted_key
                    END AS receiver_encrypted_key,

                    messages.created_at

                FROM messages

                JOIN users AS sender
                    ON messages.sender_id = sender.id

                JOIN users AS receiver
                    ON messages.receiver_id = receiver.id

                WHERE messages.sender_id = %s
                   OR messages.receiver_id = %s

                ORDER BY messages.created_at ASC
                """,
                (user_id, user_id, user_id)
            )

            messages = cursor.fetchall()

        for message in messages:
            message['created_at'] = message['created_at'].isoformat()
            message['is_sent'] = message['sender_id'] == user_id

        return {'messages': messages}

    finally:
        connection.close()


# LOGOUT
@app.route("/logout")
def logout():
    session.clear()
    return redirect(url_for("login"))

if __name__ == "__main__":
    app.run(debug=True)