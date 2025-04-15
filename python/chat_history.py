# chat_history.py
import json
import os

HISTORY_FILE = "chat_history.json"

def store_local_chat(user_msg, bot_msg):
    data = []
    if os.path.exists(HISTORY_FILE):
        with open(HISTORY_FILE, "r") as f:
            data = json.load(f)
    data.append((user_msg, bot_msg))
    with open(HISTORY_FILE, "w") as f:
        json.dump(data, f)

def load_local_history():
    if os.path.exists(HISTORY_FILE):
        with open(HISTORY_FILE, "r") as f:
            return json.load(f)
    return []
