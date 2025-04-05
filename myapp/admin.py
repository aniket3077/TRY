from django.contrib import admin

# Register your models here.

from django.contrib.auth.models import User, Group
from django.db import migrations

# def create_default_groups(apps, schema_editor):
#     Group = apps.get_model('auth', 'Group')
#     Group.objects.create(name='Admin')  # Add more groups as needed
#     Group.objects.create(name='Subscriber')
#     # Group.objects.create(name='Superadmin')



# class Migration(migrations.Migration):
#     dependencies = [
#         ('myapp', '0004_remove_chart_url'),
#     ]

#     operations = [
#         migrations.RunPython(create_default_groups),

#     ]


from django.contrib import admin
from django.core.exceptions import ValidationError
from django.utils.translation import gettext_lazy as _
from .models import UserProfile

class UserProfileAdmin(admin.ModelAdmin):
    list_display = ('user', 'client_of', 'is_superadmin', 'city', 'state', 'country')
    search_fields = ('user__username', 'client_of__username', 'city', 'state', 'country')
    list_filter = ('is_superadmin', 'city', 'state', 'country')
    fieldsets = (
        ('User Information', {
            'fields': ('user', 'client_of', 'is_superadmin')
        }),
        ('Work Experience', {
            'fields': ('past_company1', 'past_company2', 'past_company3', 'past_company4', 'past_company5'),
            'classes': ('collapse',)
        }),
        ('Education', {
            'fields': ('educational_institute1', 'educational_institute2', 'educational_institute3'),
            'classes': ('collapse',)
        }),
        ('Location', {
            'fields': ('city', 'state', 'country'),
        }),
    )

    def save_model(self, request, obj, form, change):
        # Ensure that a user cannot be their own client in the admin panel
        if obj.client_of == obj.user:
            raise ValidationError(_("A user cannot be their own client."))
        super().save_model(request, obj, form, change)

admin.site.register(UserProfile, UserProfileAdmin)
