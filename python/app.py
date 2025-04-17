import streamlit as st
import requests
import os
from dotenv import load_dotenv
from chat_history import store_local_chat, load_local_history
import PyPDF2
from io import BytesIO

load_dotenv()

# ENV Variables
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
    st.session_state.api_choice = "Groq"

# Language and API choice
col1, col2 = st.columns(2)
with col1:
    selected_lang = st.selectbox("Select Language", ["English", "Spanish", "French", "German", "Chinese", "Urdu"])
with col2:
    st.session_state.api_choice = st.selectbox("Choose API", ["Groq"])

def read_pdf(file):
    pdf_reader = PyPDF2.PdfReader(BytesIO(file.read()))
    text = ""
    for page in pdf_reader.pages:
        text += page.extract_text() + "\n"
    return text

# File upload
uploaded_file = st.file_uploader("Upload a text file (TXT or PDF)", type=["txt", "pdf"])
file_text = ""
if uploaded_file is not None:
    try:
        if uploaded_file.type == "application/pdf":
            file_text = read_pdf(uploaded_file)
        else:  # txt file
            file_text = uploaded_file.read().decode("utf-8")
        st.success("File uploaded and processed successfully.")
    except Exception as e:
        st.error(f"Error processing file: {str(e)}")
        file_text = ""

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
    if st.session_state.api_choice == "Groq":
        url = "https://api.groq.com/openai/v1/chat/completions"
        headers = {
            "Authorization": f"Bearer {GROQ_API_KEY}",
            "Content-Type": "application/json"
        }
        data = {
            "model": "compound-beta",
            "messages": [
                {"role": "user", "content": prompt_text}
            ]
        }

    response = requests.post(url, headers=headers, json=data)

    # Handle the response from the API
    if response.status_code == 200:
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
