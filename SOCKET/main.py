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


@app.route('/')
def index():
    return "SocketIO Server Running"

@socketio.on('join')
def on_join(data):
    print(data)
    username = data['username']
    room = data['room']

    join_room(room)
    print("join")
    emit('response', {'msg': f'{username} has joined the room {room}'}, room=room)

@socketio.on('text')
def handle_text(data):
    print(data)
    username = data['username']
    room = data['room']
    message = data['message']
    gender = data["gender"]
    data_1 = data.get("data")
    
  
    
    emit('response', {'username':username,"message":message,"gender": gender,"translated": data_1}, room=room)

if __name__ == '__main__':
    socketio.run(app, debug=False)