"""
Configuration Celery Beat (Scheduler)
"""
from celery.schedules import crontab

beat_schedule = {
    # Toutes les heures
    'sync-apis-hourly': {
        'task': 'app.workers.celery_tasks.sync_api_services_periodic',
        'schedule': crontab(minute=0),
    },
    
    # Toutes les 30 minutes
    'check-health-every-30min': {
        'task': 'app.workers.celery_tasks.check_api_health',
        'schedule': crontab(minute='*/30'),
    },
    
    # Tous les jours à 2h du matin
    'discover-endpoints-daily': {
        'task': 'app.workers.celery_tasks.discover_api_endpoints',
        'schedule': crontab(hour=2, minute=0),
    },
}