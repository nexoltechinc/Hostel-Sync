from django.db.models.signals import post_save
from django.dispatch import receiver

from hostels.models import Hostel

from .models import HostelSettings


@receiver(post_save, sender=Hostel)
def ensure_hostel_settings(sender, instance: Hostel, created: bool, **kwargs):
    if created:
        HostelSettings.objects.get_or_create(hostel=instance)
