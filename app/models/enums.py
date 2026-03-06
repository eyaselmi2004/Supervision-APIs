"""
enums.py — Énumérations Python
Miroir exact des types PostgreSQL créés dans 002_enums.sql
Utilisées par Pydantic pour la validation des schémas
"""
import enum


class HttpMethod(str, enum.Enum):
    GET    = "GET"
    POST   = "POST"
    PUT    = "PUT"
    DELETE = "DELETE"
    PATCH  = "PATCH"


class RuleType(str, enum.Enum):
    LATENCY    = "LATENCY"
    ERROR_RATE = "ERROR_RATE"
    DOWNTIME   = "DOWNTIME"


class Severity(str, enum.Enum):
    INFO     = "INFO"
    WARNING  = "WARNING"
    CRITICAL = "CRITICAL"


class AlertStatus(str, enum.Enum):
    OPEN         = "OPEN"
    ACKNOWLEDGED = "ACKNOWLEDGED"
    RESOLVED     = "RESOLVED"


class IncidentStatus(str, enum.Enum):
    OPEN     = "OPEN"
    RESOLVED = "RESOLVED"
    CLOSED   = "CLOSED"


class ChannelType(str, enum.Enum):
    EMAIL   = "EMAIL"
    WEBHOOK = "WEBHOOK"


class UserRole(str, enum.Enum):
    ADMIN   = "ADMIN"
    DEV     = "DEV"
    MANAGER = "MANAGER"
