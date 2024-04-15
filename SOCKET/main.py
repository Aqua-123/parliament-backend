import eventlet 
eventlet.monkey_patch()
from flask import Flask, render_template, request , redirect , url_for, session 
from flask_socketio import SocketIO , join_room , leave_room , emit
from flask_session import Session 
import logging 
import requests
app = Flask(__name__)
app.config['SECRET_KEY'] = 'CHUTIYA'

socketio = SocketIO(app, cors_allowed_origins="*")

def translate_text(text, target_lang):
    logging.info(f"Translating text: {text}")
    logging.info(f"Target lang: {target_lang}")
    try:
        translation_response = requests.post(
            "https://chatapi.aicte-india.org/text-to-text",
            data=urlencode({"outputLang": target_lang, "text": text}),
            headers={'Content-Type': 'application/x-www-form-urlencoded'},
            timeout=20, verify=False
        )
        translation_response.raise_for_status()
        print(translation_response.json().get("data"))
        return translation_response.json().get("data")
    except requests.RequestException as e:
        logging.error(f"Translation failed: {e}")
        return ""


languages_codes = ["as","gu","kn","ta","te","bn","or","hi","brx","pa","en","doi","mr","ur","ks","ml"]

languages_dictionary = {
    "assamese": "as-IN",
    "gujarati": "gu-IN",
    "kannada": "kn-IN",
    "tamil": "ta-IN",
    "telgu": "te-IN",
    "bengali": "bn-IN",
    "bodo" : "brx-IN",
    "punjabi" : "pa-IN",
    "english": "en",
    "dogri" : "doi-IN",
    "marathi": "mr-IN",
    "urdu": "ur-IN",
    "kashmiri": "ks-IN",
    "malayalam": "ml-IN",
    "konkani": "gom-IN",
    "maithili": "mai-IN",
    "nepali": "ne-IN"
}

@app.route('/')
def index():
    return "SocketIO Server Running"

@socketio.on('join')
def on_join(data):
    username = data['username']
    room = data['room']
    join_room(room)
    emit('response', {'msg': f'{username} has joined the room {room}'}, room=room)

@socketio.on('text')
def handle_text(data):
    username = data['username']
    room = data['room']
    message = data['message']
    gender = data["gender"]
    data = data["data"]
    
  
    
    emit('response', {'username':username,"message":message,"gender": gender,"translated": data}, room=room)

if __name__ == '__main__':
    socketio.run(app, debug=True)