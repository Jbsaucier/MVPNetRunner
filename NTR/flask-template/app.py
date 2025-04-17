from flask import Flask, render_template, jsonify, request, redirect, url_for, session
import json
import os
import uuid
import requests

app = Flask(__name__)
app.secret_key = "unique_secret_key_for_this_app"  # Change this to a unique value

DATA_PATH = os.path.join(os.path.dirname(__file__), "data", "game.json")
USER_PATH = os.path.join(os.path.dirname(__file__), "data", "user.json")

# Migration automatique : transforme l'ancien format user.json (objet unique) en liste si besoin
# Si user.json existe et est un objet, le convertir en liste d'utilisateurs
if os.path.exists(USER_PATH):
    with open(USER_PATH, encoding="utf-8") as f:
        try:
            users = json.load(f)
            if isinstance(users, dict):
                users = [users]
                with open(USER_PATH, "w", encoding="utf-8") as fw:
                    json.dump(users, fw, ensure_ascii=False, indent=2)
        except Exception:
            pass

def load_users():
    if not os.path.exists(USER_PATH):
        return []
    with open(USER_PATH, encoding="utf-8") as f:
        try:
            users = json.load(f)
            if isinstance(users, dict):
                # Migration: ancien format, un seul utilisateur
                users = [users]
        except Exception:
            users = []
    return users

def save_users(users):
    with open(USER_PATH, "w", encoding="utf-8") as f:
        json.dump(users, f, ensure_ascii=False, indent=2)

def get_or_create_user(username):
    users = load_users()
    for user in users:
        if user["username"] == username:
            return user
    # Crée un nouvel utilisateur minimal
    new_user = {
        "user_id": f"user_{username}",
        "username": username
    }
    users.append(new_user)
    save_users(users)
    return new_user

def load_game_data():
    with open(DATA_PATH, encoding="utf-8") as f:
        return json.load(f)

def save_game_data(game):
    with open(DATA_PATH, "w", encoding="utf-8") as f:
        json.dump(game, f, ensure_ascii=False, indent=2)

def get_role_availability():
    game = load_game_data()
    roles = {
        "corp": {
            "taken": bool(game["corp_state"].get("user_id")),
            "user": game["corp_state"].get("user_id")
        },
        "runner": {
            "taken": bool(game["runner_state"].get("user_id")),
            "user": game["runner_state"].get("user_id")
        }
    }
    return roles

@app.route("/", methods=["GET"])
def index():
    return redirect(url_for("login"))

@app.route("/login", methods=["GET", "POST"])
def login():
    error = None
    if request.method == "POST":
        username = request.form["username"]
        session["username"] = username
        return redirect(url_for("role_select"))
    return render_template("login.html", error=error)

@app.route("/role", methods=["GET", "POST"])
def role_select():
    error = None
    if "username" not in session:
        return redirect(url_for("login"))
    
    username = session["username"]
    game = load_game_data()
    roles = get_role_availability()
    
    # Check if user already has a role
    user_current_role = None
    if roles["corp"]["user"] == username:
        user_current_role = "corp"
    elif roles["runner"]["user"] == username:
        user_current_role = "runner"
    
    if user_current_role:
        session["role"] = user_current_role
        return redirect(url_for("home"))
    
    if request.method == "POST":
        role = request.form.get("role")
        if role not in ["corp", "runner"]:
            error = "Choisissez un rôle valide."
        elif roles[role]["taken"] and roles[role]["user"] != username:
            error = f"Le rôle {role} est déjà pris par {roles[role]['user']}."
        else:
            # Re-check role availability to prevent race conditions
            roles = get_role_availability()
            if roles[role]["taken"] and roles[role]["user"] != username:
                error = f"Le rôle {role} vient d'être pris par {roles[role]['user']}."
            else:
                session["role"] = role
                # Update game.json with the player's name
                if role == "corp":
                    game["corp_state"]["user_id"] = username
                else:
                    game["runner_state"]["user_id"] = username
                save_game_data(game)
                return redirect(url_for("home"))
    
    return render_template(
        "role.html", 
        username=username, 
        error=error, 
        roles=roles
    )

# Add a new endpoint to get current role status via AJAX
@app.route("/api/roles")
def get_roles():
    roles = get_role_availability()
    return jsonify(roles)

@app.route("/home")
def home():
    if "username" not in session or "role" not in session:
        return redirect(url_for("login"))
    
    username = session["username"]
    role = session["role"]
    
    # Verify the user still has this role in the game data
    game = load_game_data()
    user_in_game = False
    
    if role == "corp" and game["corp_state"].get("user_id") == username:
        user_in_game = True
    elif role == "runner" and game["runner_state"].get("user_id") == username:
        user_in_game = True
    
    # If the user's role was taken by someone else, send back to role selection
    if not user_in_game:
        return redirect(url_for("role_select"))
    
    # Generate a unique UUID for the user if not already in session
    if 'user_uuid' not in session:
        session['user_uuid'] = str(uuid.uuid4())
    user_uuid = session['user_uuid']
    
    server_path = os.path.join(os.path.dirname(__file__), "data", "server.json")
    with open(server_path, encoding="utf-8") as f:
        servers = json.load(f)
    
    return render_template("home.html", game=game, servers=servers, role=role, user_id=username, user_uuid=user_uuid)

@app.route("/about")
def about():
    return render_template("about.html")

@app.route("/api/game", methods=["GET"])
def get_game():
    with open(DATA_PATH, encoding="utf-8") as f:
        game = json.load(f)
    return jsonify(game)

@app.route("/api/game", methods=["POST"])
def update_game():
    data = request.json
    with open(DATA_PATH, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    return jsonify({"status": "updated"})

@app.route("/api/servers")
def get_servers():
    server_path = os.path.join(os.path.dirname(__file__), "data", "server.json")
    with open(server_path, encoding="utf-8") as f:
        servers = json.load(f)
    return jsonify(servers)

@app.route("/api/servers", methods=["POST"])
def update_servers():
    data = request.json
    server_path = os.path.join(os.path.dirname(__file__), "data", "server.json")
    with open(server_path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    return jsonify({"status": "updated"})

@app.route("/api/rigs")
def get_rigs():
    rig_path = os.path.join(os.path.dirname(__file__), "data", "rig.json")
    with open(rig_path, encoding="utf-8") as f:
        rigs = json.load(f)
    return jsonify(rigs)

@app.route("/api/rigs", methods=["POST"])
def update_rigs():
    try:
        data = request.json
        rig_path = os.path.join(os.path.dirname(__file__), "data", "rig.json")
        
        # Verify we have the right data structure
        if not isinstance(data, list):
            return jsonify({"status": "error", "message": "Expected list data structure for rigs"}), 400
        
        # Save the data
        with open(rig_path, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
        
        return jsonify({"status": "updated", "message": "Rig data successfully updated"})
    except Exception as e:
        print(f"Error in update_rigs: {e}")
        return jsonify({"status": "error", "message": str(e)}), 500

@app.route("/api/deck")
def get_deck():
    deck_path = os.path.join(os.path.dirname(__file__), "data", "deck.json")
    with open(deck_path, encoding="utf-8") as f:
        decks = json.load(f)
    return jsonify(decks)

@app.route("/logout")
def logout():
    username = session.get("username")
    role = session.get("role")
    
    if username and role:
        game = load_game_data()
        if role == "corp" and game["corp_state"].get("user_id") == username:
            game["corp_state"]["user_id"] = ""
        elif role == "runner" and game["runner_state"].get("user_id") == username:
            game["runner_state"]["user_id"] = ""
        save_game_data(game)
    
    session.clear()
    return redirect(url_for("login"))

@app.route("/reset-roles")
def reset_roles():
    # Load the current game state
    game = load_game_data()
    
    # Reset both roles to empty
    game["corp_state"]["user_id"] = ""
    game["runner_state"]["user_id"] = ""
    
    try:
        # Load deck data
        deck_path = os.path.join(os.path.dirname(__file__), "data", "deck.json")
        print(f"Loading deck data from {deck_path}")
        with open(deck_path, encoding="utf-8") as f:
            deck_data = json.load(f)
        
        # Initialize Runner deck cards for stack
        runner_stack_cards = []
        
        for card in deck_data["catalyst_deck"]["cards"]:
            for i in range(card["quantity"]):
                card_copy = card.copy()
                if card["quantity"] > 1:
                    card_copy["card_code"] = f"{card['card_code']}-{i+1}"
                else:
                    card_copy["card_code"] = card["card_code"]
                card_copy["id"] = card_copy["card_code"]
                card_copy["faceup"] = False
                card_copy["tokens"] = 0
                card_copy["title"] = card["title"]
                card_copy["image_url"] = f"/static/img/cards/{card['card_code'].split('-')[0]}.jpg"
                del card_copy["quantity"]
                runner_stack_cards.append(card_copy)
        
        print(f"Created {len(runner_stack_cards)} runner cards")
        
        # Initialize Corp deck (for R&D)
        corp_cards = []
        for card in deck_data["syndicate_deck"]["cards"]:
            for i in range(card["quantity"]):
                card_copy = card.copy()
                if card["quantity"] > 1:
                    card_copy["card_code"] = f"{card['card_code']}-{i+1}"
                else:
                    card_copy["card_code"] = card["card_code"]
                card_copy["id"] = card_copy["card_code"]
                card_copy["faceup"] = False
                card_copy["tokens"] = 0
                card_copy["title"] = card["title"]
                card_copy["image_url"] = f"/static/img/cards/{card['card_code'].split('-')[0]}.jpg"
                del card_copy["quantity"]
                corp_cards.append(card_copy)
        
        # Shuffle decks
        import random
        random.shuffle(corp_cards)
        random.shuffle(runner_stack_cards)
        
        # Set up servers
        server_data = {
            "central": [
                {
                    "id": "rd",
                    "name": "R&D",
                    "ice": [],
                    "cards": corp_cards
                },
                {
                    "id": "hq",
                    "name": "HQ",
                    "ice": [],
                    "cards": []
                },
                {
                    "id": "archives",
                    "name": "Archives",
                    "ice": [],
                    "cards": []
                }
            ],
            "remote": []
        }
        
        # Set up rigs with proper structure
        rig_data = [
            {
                "rig_id": "heap",
                "user_id": "",
                "cards": []
            },
            {
                "rig_id": "stack",
                "user_id": "",
                "cards": runner_stack_cards  # Add all runner cards here
            },
            {
                "rig_id": "identity",
                "user_id": "",
                "cards": []
            },
            {
                "rig_id": "programs",
                "user_id": "",
                "cards": []
            },
            {
                "rig_id": "hardware",
                "user_id": "",
                "cards": []
            },
            {
                "rig_id": "resources",
                "user_id": "",
                "cards": []
            }
        ]
        
        # Initialize runner and corp state
        game["runner_state"]["credits"] = 5
        game["runner_state"]["clicks"] = 4
        game["runner_state"]["tags"] = 0
        game["runner_state"]["bad_publicity"] = 0
        game["runner_state"]["hand_size_mod"] = 0
        game["runner_state"]["mandatory_draw"] = False
        game["runner_state"]["deck_name"] = deck_data["catalyst_deck"]["name"]
        
        game["corp_state"]["credits"] = 5
        game["corp_state"]["clicks"] = 3
        game["corp_state"]["bad_publicity"] = 0
        game["corp_state"]["deck_name"] = deck_data["syndicate_deck"]["name"]
        
        # Save files using separate functions to ensure no conflicts
        try:
            # Save server.json
            server_path = os.path.join(os.path.dirname(__file__), "data", "server.json")
            print(f"Saving server data to {server_path}")
            with open(server_path, "w", encoding="utf-8") as f:
                json.dump(server_data, f, ensure_ascii=False, indent=2)
            print("Server data saved successfully")
            
            # Save rig.json
            rig_path = os.path.join(os.path.dirname(__file__), "data", "rig.json")
            print(f"Saving rig data to {rig_path}")
            with open(rig_path, "w", encoding="utf-8") as f:
                json.dump(rig_data, f, ensure_ascii=False, indent=2)
            print("Rig data saved successfully")
            
            # Save game.json
            print(f"Saving game data to {DATA_PATH}")
            save_game_data(game)
            print("Game data saved successfully")
            
        except Exception as save_error:
            print(f"Error saving data: {save_error}")
            import traceback
            traceback.print_exc()
            
    except Exception as e:
        print(f"Error initializing game: {e}")
        import traceback
        traceback.print_exc()
    
    # Redirect back to the role selection page
    return redirect(url_for("role_select"))

if __name__ == "__main__":
    import sys
    port = 5000
    # Permet de lancer avec : python app.py --port 5001
    if len(sys.argv) > 2 and sys.argv[1] == "--port":
        try:
            port = int(sys.argv[2])
        except Exception:
            pass
    
    # Use a unique session cookie name based on port
    app.config['SESSION_COOKIE_NAME'] = f'flask_session_port_{port}'
    
    app.run(debug=True, port=port)