import streamlit as st
import requests
import os
from dotenv import load_dotenv
from chat_history import store_local_chat, load_local_history

load_dotenv()

# ENV Variables
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
GROQ_API_KEY = os.getenv("GROQ_API_KEY")

st.set_page_config(page_title="Multi-Lingual Chatbot", layout="wide", page_icon="🤖")
st.markdown(""" 
    <style>
        .block-container {
            padding-top: 2rem;
        }
        footer {visibility: hidden;}
    </style>
""", unsafe_allow_html=True)

st.title("🌍 Multi-Lingual Chatbot")

# Session states
if "messages" not in st.session_state:
    st.session_state.messages = []
if "api_choice" not in st.session_state:
    st.session_state.api_choice = "Gemini"

# Language and API choice
col1, col2 = st.columns(2)
with col1:
    selected_lang = st.selectbox("Select Language", ["English", "Spanish", "French", "German", "Chinese", "Urdu"])
with col2:
    st.session_state.api_choice = st.selectbox("Choose API", ["Gemini", "Groq"])

# File upload
uploaded_file = st.file_uploader("Upload a text file (TXT only)", type=["txt"])
file_text = ""
if uploaded_file is not None:
    file_text = uploaded_file.read().decode("utf-8")
    st.success("File uploaded and processed.")

# Show local history
if st.button("📜 Show Previous Conversations"):
    st.subheader("Recent Conversations")
    history = load_local_history()
    for user_msg, bot_msg in history[-10:]:
        st.markdown(f"**You:** {user_msg}\n\n**Bot:** {bot_msg}")
        st.markdown("---")

# Display chat messages
for msg in st.session_state.messages:
    with st.chat_message(msg["role"]):
        st.markdown(msg["content"])

# Chat input
user_input = st.chat_input("Type your message...")
if user_input:
    st.session_state.messages.append({"role": "user", "content": user_input})
    with st.chat_message("user"):
        st.markdown(user_input)

    # Create the prompt based on the uploaded file text and user input
    prompt_text = f"Translate/Respond in {selected_lang}:\n{file_text}\nUser: {user_input}"

    headers, url, data = {}, "", {}

    # Check which API to use
    if st.session_state.api_choice == "Gemini":
        url = "https://generativelanguage.googleapis.com/v1/models/gemini-2.0-flash-lite:generateContent?key=" + GEMINI_API_KEY
        data = {
            "contents": [{"parts": [{"text": prompt_text}]}]
        }
        headers = {"Content-Type": "application/json"}
    else:
        url = "https://api.groq.com/openai/v1/chat/completions"
        headers = {
            "Authorization": f"Bearer {GROQ_API_KEY}",
            "Content-Type": "application/json"
        }
        data = {
            "model": "mistral-saba-24b",
            "messages": [
                {"role": "user", "content": prompt_text}
            ]
        }

    response = requests.post(url, headers=headers, json=data)

    # Handle the response from the API
    if response.status_code == 200:
        if st.session_state.api_choice == "Gemini":
            bot_reply = response.json()['candidates'][0]['content']['parts'][0]['text']
        else:
            bot_reply = response.json()['choices'][0]['message']['content']

        st.session_state.messages.append({"role": "assistant", "content": bot_reply})
        with st.chat_message("assistant"):
            st.markdown(bot_reply)

        store_local_chat(user_input, bot_reply)
    else:
        st.error("Error from API: " + response.text)

# Footer
st.markdown("""
---
<center> © Abdul Rauf Jatoi | Icreativiz Technology</center>
""", unsafe_allow_html=True)
