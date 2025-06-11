from django.contrib import admin

# Register your models here.
from django.contrib.auth.models import User, Group
from django.db import migrations
from django.utils.timezone import now

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
from .models import UserProfile, ChartAccess

class UserProfileAdmin(admin.ModelAdmin):
    readonly_fields = ('access_uuid',)
    list_display = ('user', 'client_of', 'is_superadmin', 'city', 'state', 'country')
    search_fields = ('user__username', 'client_of__username', 'city', 'state', 'country')
    list_filter = ('is_superadmin', 'city', 'state', 'country')
    fieldsets = (
        ('User Information', {
            'fields': ('access_uuid' , 'user', 'client_of', 'is_superadmin')
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


@admin.register(ChartAccess)
class ChartAccessAdmin(admin.ModelAdmin):
    list_display = ('user', 'chart_title', 'access_grant_time', 'expiration_time', 'is_expired')
    list_filter = ('access_grant_time', 'expiration_time')
    search_fields = ('user__username', 'chart__title')
    readonly_fields = ('user', 'chart_title', 'access_grant_time', 'expiration_time')

    def chart_title(self, obj):
        return obj.chart.title
    chart_title.short_description = 'Chart Title'
    
    def has_add_permission(self, request):
        return False  # Prevent add

    def has_change_permission(self, request, obj=None):
        return False  # Prevent edit

    def has_delete_permission(self, request, obj=None):
        return False  # Prevent delete

    def is_expired(self, obj):
        return obj.expiration_time < now()
    is_expired.boolean = True
    is_expired.short_description = 'Expired?'
