from flask_sqlalchemy import SQLAlchemy
from flask_migrate import Migrate
from flask_socketio import SocketIO

# Import Base to attach its metadata to SQLAlchemy
from backend.app.models.base import Base

# Initialise SQLAlchemy with the existing Base metadata so models are discovered
db = SQLAlchemy(metadata=Base.metadata)

# Migrate object will be initialised in the app factory
migrate = Migrate()

# SocketIO extension – will be initialised with the Flask app in the factory
socketio = SocketIO(cors_allowed_origins="*")
