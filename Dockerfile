# syntax=docker/dockerfile:1

FROM python:3.12-slim

WORKDIR /python-docker

COPY requirements.txt requirements.txt
RUN pip3 install -r requirements.txt

COPY app.py .
COPY graph/graph_data.json graph/graph_user_data.json ./graph/

CMD ["gunicorn", "--bind", "0.0.0.0:5000", "app:app"]
