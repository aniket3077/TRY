# Generated by Django 4.2.23 on 2025-07-17 18:03

from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ('myapp', '0032_marketplacesettings_alter_image_image'),
    ]

    operations = [
        migrations.CreateModel(
            name='SampleRequest',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('email', models.EmailField(max_length=255)),
                ('requirements', models.TextField(help_text="User's requirements for the sample")),
                ('chart_title', models.CharField(help_text='Chart title at time of request', max_length=500)),
                ('status', models.CharField(choices=[('pending', 'Pending'), ('approved', 'Approved'), ('rejected', 'Rejected'), ('completed', 'Completed')], default='pending', max_length=20)),
                ('admin_notes', models.TextField(blank=True, help_text='Internal notes for admin use', null=True)),
                ('processed_at', models.DateTimeField(blank=True, null=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('chart', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='sample_requests', to='myapp.chart')),
                ('processed_by', models.ForeignKey(blank=True, help_text='Admin who processed this request', null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='processed_sample_requests', to=settings.AUTH_USER_MODEL)),
                ('user', models.ForeignKey(blank=True, help_text='User who made the request (if authenticated)', null=True, on_delete=django.db.models.deletion.SET_NULL, to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'verbose_name': 'Sample Request',
                'verbose_name_plural': 'Sample Requests',
                'ordering': ['-created_at'],
            },
        ),
    ]
