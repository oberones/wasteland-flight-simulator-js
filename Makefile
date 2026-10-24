SHELL := /bin/sh
COMPOSE := docker compose
SERVICE := wasteland-flight-simulator

.PHONY: docker-config docker-build docker-up docker-down docker-logs

docker-config:
	$(COMPOSE) config

docker-build:
	$(COMPOSE) build --pull $(SERVICE)

docker-up:
	$(COMPOSE) up -d --wait $(SERVICE)

docker-down:
	$(COMPOSE) down

docker-logs:
	$(COMPOSE) logs -f $(SERVICE)
