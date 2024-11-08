from pathlib import Path

from flask import Flask, send_file
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

GRAPH_DIR = Path(__file__).resolve().parent / "graph"


@app.get("/api/graph-user-data")
def get_graph_user_data():
    return send_file(GRAPH_DIR / "graph_user_data.json", mimetype="application/json")


@app.get("/api/graph-data")
def get_graph_data():
    return send_file(GRAPH_DIR / "graph_data.json", mimetype="application/json")


if __name__ == "__main__":
    app.run(ssl_context="adhoc")
