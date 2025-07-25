# Generated by Django 5.0.2 on 2025-06-16 07:00

import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('myapp', '0026_remove_customerinfo_tax_id_remove_order_cgst_amount_and_more'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.AddField(
            model_name='order',
            name='coupon_code',
            field=models.CharField(blank=True, help_text='Coupon code used (stored for historical record)', max_length=50, null=True),
        ),
        migrations.AddField(
            model_name='order',
            name='discount_amount',
            field=models.DecimalField(decimal_places=2, default=0, help_text='Amount discounted by coupon', max_digits=10),
        ),
        migrations.CreateModel(
            name='Coupon',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('code', models.CharField(help_text='Coupon code (case-insensitive)', max_length=50, unique=True)),
                ('name', models.CharField(help_text='Internal name for the coupon', max_length=200)),
                ('description', models.TextField(blank=True, help_text='Description of the coupon offer', null=True)),
                ('discount_type', models.CharField(choices=[('percentage', 'Percentage'), ('fixed', 'Fixed Amount')], default='percentage', max_length=10)),
                ('discount_value', models.DecimalField(decimal_places=2, help_text='Percentage (0-100) or fixed amount', max_digits=10)),
                ('max_uses', models.PositiveIntegerField(blank=True, help_text='Maximum number of times this coupon can be used (leave blank for unlimited)', null=True)),
                ('max_uses_per_user', models.PositiveIntegerField(default=1, help_text='Maximum uses per user')),
                ('current_uses', models.PositiveIntegerField(default=0, help_text='Current number of times this coupon has been used')),
                ('minimum_order_amount', models.DecimalField(blank=True, decimal_places=2, help_text='Minimum order amount required', max_digits=10, null=True)),
                ('maximum_discount_amount', models.DecimalField(blank=True, decimal_places=2, help_text='Maximum discount amount (for percentage coupons)', max_digits=10, null=True)),
                ('valid_from', models.DateTimeField(help_text='When the coupon becomes valid')),
                ('valid_until', models.DateTimeField(help_text='When the coupon expires')),
                ('new_users_only', models.BooleanField(default=False, help_text="Only available to users who haven't made a purchase before")),
                ('status', models.CharField(choices=[('active', 'Active'), ('inactive', 'Inactive'), ('expired', 'Expired')], default='active', max_length=10)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('allowed_users', models.ManyToManyField(blank=True, help_text='Specific users who can use this coupon (leave blank for all users)', to=settings.AUTH_USER_MODEL)),
                ('applicable_charts', models.ManyToManyField(blank=True, help_text='Specific charts this coupon applies to (leave blank for all charts)', to='myapp.chart')),
                ('created_by', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='created_coupons', to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'verbose_name': 'Coupon',
                'verbose_name_plural': 'Coupons',
                'ordering': ['-created_at'],
            },
        ),
        migrations.AddField(
            model_name='order',
            name='applied_coupon',
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='orders', to='myapp.coupon'),
        ),
        migrations.CreateModel(
            name='CouponUsage',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('discount_amount', models.DecimalField(decimal_places=2, max_digits=10)),
                ('used_at', models.DateTimeField(auto_now_add=True)),
                ('coupon', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='usages', to='myapp.coupon')),
                ('order', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.CASCADE, to='myapp.order')),
                ('user', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'verbose_name': 'Coupon Usage',
                'verbose_name_plural': 'Coupon Usages',
                'unique_together': {('coupon', 'order')},
            },
        ),
    ]
