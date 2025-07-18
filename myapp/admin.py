from django.contrib import admin

# Register your models here.
from django.contrib.auth.models import User, Group
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from django.db import migrations
from django.utils.timezone import now
from django.utils.html import format_html
import os

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
from django.contrib import messages
from django.shortcuts import redirect
from django.urls import path, reverse
from django.utils.html import format_html
from django.http import HttpResponseRedirect
from django.db import models
from django.utils import timezone
from .models import UserProfile, ChartAccess, Cart, CartItem, Cart, CartItem, CompanyInfo, Order, OrderItem, CustomerInfo, chart, Coupon, RefundLog, CouponUsage, MarketplaceSettings, SampleRequest

# UserProfile Inline Admin for User model
class UserProfileInline(admin.StackedInline):
    model = UserProfile
    fk_name = 'user'  # Specify which ForeignKey to use
    can_delete = False
    verbose_name_plural = 'User Profile'
    extra = 0
    readonly_fields = ('access_uuid',)
    
    fieldsets = (
        ('Profile Information', {
            'fields': ('access_uuid', 'client_of', 'is_superadmin')
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

# Extended User Admin
class CustomUserAdmin(BaseUserAdmin):
    inlines = (UserProfileInline,)
    list_display = BaseUserAdmin.list_display + ('get_is_superadmin', 'get_client_of')
    
    def get_is_superadmin(self, obj):
        try:
            return obj.userprofile.is_superadmin
        except UserProfile.DoesNotExist:
            return False
    get_is_superadmin.boolean = True
    get_is_superadmin.short_description = 'Is Super Admin'
    
    def get_client_of(self, obj):
        try:
            return obj.userprofile.client_of
        except UserProfile.DoesNotExist:
            return None
    get_client_of.short_description = 'Client Of'

# Unregister the default User admin and register our custom one
admin.site.unregister(User)
admin.site.register(User, CustomUserAdmin)

@admin.register(UserProfile)
class UserProfileAdmin(admin.ModelAdmin):
    readonly_fields = ('access_uuid',)
    list_display = ('user', 'user_email', 'client_of', 'is_superadmin', 'city', 'state', 'country', 'user_active_status')
    search_fields = ('user__username', 'user__email', 'client_of__username', 'city', 'state', 'country')
    list_filter = ('is_superadmin', 'city', 'state', 'country', 'user__is_active', 'user__is_superuser')
    list_per_page = 25
    ordering = ('user__username',)
    
    fieldsets = (
        ('User Information', {
            'fields': ('access_uuid', 'user', 'client_of', 'is_superadmin')
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

    def user_email(self, obj):
        """Display user email in admin list"""
        return obj.user.email
    user_email.short_description = 'Email'
    user_email.admin_order_field = 'user__email'

    def user_active_status(self, obj):
        """Display user active status"""
        return obj.user.is_active
    user_active_status.boolean = True
    user_active_status.short_description = 'Active'
    user_active_status.admin_order_field = 'user__is_active'

    def save_model(self, request, obj, form, change):
        # Ensure that a user cannot be their own client in the admin panel
        if obj.client_of == obj.user:
            raise ValidationError(_("A user cannot be their own client."))
        super().save_model(request, obj, form, change)

    def get_queryset(self, request):
        """Optimize queryset with select_related to reduce database queries"""
        return super().get_queryset(request).select_related('user', 'client_of')

# Customize admin site headers
admin.site.site_header = "OrgChart Administration"
admin.site.site_title = "OrgChart Admin Portal"
admin.site.index_title = "Welcome to OrgChart Administration"







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


@admin.register(Cart)
class CartAdmin(admin.ModelAdmin):
    list_display = ('user', 'created_at', 'updated_at', 'get_total_items', 'get_total_price')
    list_filter = ('created_at', 'updated_at')
    search_fields = ('user__username', 'user__email')
    readonly_fields = ('created_at', 'updated_at')


@admin.register(CartItem)
class CartItemAdmin(admin.ModelAdmin):
    list_display = ('cart', 'chart', 'quantity', 'get_total_price', 'added_at')
    list_filter = ('added_at',)
    search_fields = ('cart__user__username', 'chart__title')
    readonly_fields = ('added_at',)


@admin.register(CompanyInfo)
class CompanyInfoAdmin(admin.ModelAdmin):
    list_display = ('name', 'city', 'state', 'country', 'phone', 'email', 'is_active')
    list_filter = ('is_active', 'country', 'state')
    search_fields = ('name', 'email', 'phone', 'gst_number', 'pan_number')
    fieldsets = (
        ('Company Information', {
            'fields': ('name', 'email', 'phone', 'website', 'is_active')
        }),
        ('Address Details', {
            'fields': ('address_line1', 'address_line2', 'city', 'state', 'country', 'postal_code')
        }),
        ('Tax Information', {
            'fields': ('gst_number', 'pan_number'),
            'classes': ('collapse',)
        }),
        ('Banking Details', {
            'fields': ('bank_name', 'bank_account_number', 'bank_ifsc_code'),
            'classes': ('collapse',)
        }),
    )


@admin.register(Order)
class OrderAdmin(admin.ModelAdmin):
    list_display = ('order_id', 'user', 'total_amount', 'currency', 'status', 'created_by', 'created_at', 'send_invoice_action')
    list_filter = ('status', 'currency', 'created_by', 'created_at')
    search_fields = ('order_id', 'user__username', 'user__email', 'created_by__username', 'razorpay_payment_id', 'razorpay_order_id')
    readonly_fields = ('order_id', 'payment_id', 'razorpay_order_id', 'razorpay_payment_id', 'created_by', 'created_at', 'updated_at')
    ordering = ('-created_at',)
    actions = ['send_invoice_emails', 'create_manual_order']
    
    def send_invoice_action(self, obj):
        """Button to send invoice for individual order"""
        url = reverse('admin:send_invoice', args=[obj.id])
        return format_html(
            '<a class="button" href="{}">Send Invoice</a>',
            url
        )
    send_invoice_action.short_description = 'Actions'
    
    def send_invoice_emails(self, request, queryset):
        """Send invoice emails for selected orders"""
        from .views import send_invoice_email
        success_count = 0
        error_count = 0
        
        for order in queryset:
            try:
                if send_invoice_email(order):
                    success_count += 1
                else:
                    error_count += 1
            except Exception as e:
                error_count += 1
        
        if success_count:
            messages.success(request, f'Successfully sent {success_count} invoice(s).')
        if error_count:
            messages.error(request, f'Failed to send {error_count} invoice(s).')
    
    send_invoice_emails.short_description = "Send invoice emails for selected orders"
    
    def create_manual_order(self, request, queryset):
        """Redirect to manual order creation page"""
        return HttpResponseRedirect(reverse('admin:create_manual_order'))
    
    create_manual_order.short_description = "Create new manual order"
    
    def get_urls(self):
        urls = super().get_urls()
        custom_urls = [
            path(
                'send-invoice/<int:order_id>/',
                self.admin_site.admin_view(self.send_invoice_view),
                name='send_invoice',
            ),
            path(
                'create-manual-order/',
                self.admin_site.admin_view(self.create_manual_order_view),
                name='create_manual_order',
            ),
        ]
        return custom_urls + urls
    
    def send_invoice_view(self, request, order_id):
        """Send invoice for a specific order"""
        from .views import send_invoice_email
        try:
            order = Order.objects.get(id=order_id)
            if send_invoice_email(order):
                messages.success(request, f'Invoice sent successfully for order {order.order_id}')
            else:
                messages.error(request, f'Failed to send invoice for order {order.order_id}')
        except Order.DoesNotExist:
            messages.error(request, 'Order not found')
        except Exception as e:
            messages.error(request, f'Error sending invoice: {str(e)}')
        
        return HttpResponseRedirect(reverse('admin:myapp_order_changelist'))
    
    def create_manual_order_view(self, request):
        """Handle manual order creation"""
        if request.method == 'POST':
            return self.process_manual_order(request)
        
        # Get available users and charts for the form
        from django.contrib.auth.models import User
        users = User.objects.all().order_by('username')
        charts = chart.objects.all().order_by('title')
        
        context = {
            'users': users,
            'charts': charts,
            'title': 'Create Manual Order',
            'opts': self.model._meta,
            'has_change_permission': True,
        }
        
        from django.template.response import TemplateResponse
        return TemplateResponse(request, 'admin/create_manual_order.html', context)
    
    def process_manual_order(self, request):
        """Process the manual order creation form"""
        from django.utils import timezone
        from .views import send_invoice_email
        
        try:
            # Get form data
            user_id = request.POST.get('user')
            chart_ids = request.POST.getlist('charts')
            billing_name = request.POST.get('billing_name', '')
            billing_address = request.POST.get('billing_address', '')
            billing_phone = request.POST.get('billing_phone', '')
            notes = request.POST.get('notes', '')
            send_email = request.POST.get('send_email') == 'on'
            
            # Validate required fields
            if not user_id or not chart_ids:
                messages.error(request, 'User and at least one chart are required.')
                return HttpResponseRedirect(reverse('admin:create_manual_order'))
            
            # Get user and charts
            user = User.objects.get(id=user_id)
            selected_charts = chart.objects.filter(id__in=chart_ids)
            
            # Calculate totals with processing fee
            subtotal = sum(float(c.price) for c in selected_charts)
            processing_fee = round(subtotal * 0.055, 2)  # 5.5% processing fee
            total_amount = subtotal + processing_fee
            
            # Get or create customer info
            customer_info, created = CustomerInfo.objects.get_or_create(
                user=user,
                defaults={
                    'company_name': billing_name,
                    'address_line1': billing_address,
                    'phone': billing_phone,
                }
            )            # Create order
            order = Order.objects.create(
                user=user,
                created_by=request.user,  # Track which admin created the order
                order_id=f'MANUAL-{int(timezone.now().timestamp())}',
                payment_id=f'manual_{timezone.now().strftime("%Y%m%d_%H%M%S")}',
                total_amount=total_amount,
                base_amount=subtotal,
                processing_fee=processing_fee,
                billing_name=billing_name or customer_info.company_name,
                billing_address=billing_address or customer_info.full_address,
                billing_phone=billing_phone or customer_info.phone,
                payment_method='marked_paid',
                currency='USD',
                status='completed',
                items_data=[{
                    'chart_id': c.id,
                    'chart_title': c.title,
                    'price': float(c.price),
                    'industry': c.industry,
                    'country': c.country
                } for c in selected_charts]
            )
            
            # Create order items
            for chart_obj in selected_charts:
                OrderItem.objects.create(
                    order=order,
                    chart=chart_obj,
                    price_at_purchase=chart_obj.price,
                    chart_title_at_purchase=chart_obj.title
                )
            
            # Grant access to charts
            from .models import ChartAccess
            for chart_obj in selected_charts:
                ChartAccess.grant_access(user, chart_obj, 30)
                chart_obj.allowed_users.add(user)
            
            # Send invoice email if requested
            if send_email:
                try:
                    if send_invoice_email(order):
                        messages.success(request, f'Manual order {order.order_id} created successfully and invoice sent to {user.email}!')
                    else:
                        messages.warning(request, f'Manual order {order.order_id} created successfully but failed to send invoice email.')
                except Exception as e:
                    messages.warning(request, f'Manual order {order.order_id} created successfully but error sending email: {str(e)}')
            else:
                messages.success(request, f'Manual order {order.order_id} created successfully!')
            
            return HttpResponseRedirect(reverse('admin:myapp_order_change', args=[order.id]))
            
        except Exception as e:
            messages.error(request, f'Error creating manual order: {str(e)}')
            return HttpResponseRedirect(reverse('admin:create_manual_order'))


@admin.register(OrderItem)
class OrderItemAdmin(admin.ModelAdmin):
    list_display = ('order', 'chart_title_at_purchase', 'price_at_purchase')
    list_filter = ('order__created_at',)
    search_fields = ('order__order_id', 'chart__title', 'chart_title_at_purchase')
    readonly_fields = ('order', 'chart', 'price_at_purchase', 'chart_title_at_purchase')


# Coupon Admin
@admin.register(Coupon)
class CouponAdmin(admin.ModelAdmin):
    list_display = ('code', 'name', 'discount_type', 'discount_value', 'status', 'current_uses', 'max_uses', 'valid_from', 'valid_until', 'created_by')
    list_filter = ('status', 'discount_type', 'created_at', 'valid_from', 'valid_until', 'new_users_only')
    search_fields = ('code', 'name', 'description')
    readonly_fields = ('current_uses', 'created_at', 'updated_at')
    filter_horizontal = ('allowed_users', 'applicable_charts')
    
    fieldsets = (
        ('Basic Information', {
            'fields': ('code', 'name', 'description', 'status')
        }),
        ('Discount Settings', {
            'fields': ('discount_type', 'discount_value', 'maximum_discount_amount')
        }),
        ('Usage Limitations', {
            'fields': ('max_uses', 'current_uses', 'max_uses_per_user', 'minimum_order_amount')
        }),
        ('Date Limitations', {
            'fields': ('valid_from', 'valid_until')
        }),
        ('User Restrictions', {
            'fields': ('allowed_users', 'new_users_only'),
            'classes': ('collapse',)
        }),
        ('Chart Restrictions', {
            'fields': ('applicable_charts',),
            'classes': ('collapse',)
        }),
        ('Metadata', {
            'fields': ('created_by', 'created_at', 'updated_at'),
            'classes': ('collapse',)
        })
    )
    
    def save_model(self, request, obj, form, change):
        if not change:  # If creating new coupon
            obj.created_by = request.user
        super().save_model(request, obj, form, change)
    
    def get_queryset(self, request):
        queryset = super().get_queryset(request)
        return queryset.select_related('created_by').prefetch_related('allowed_users', 'applicable_charts')


@admin.register(CouponUsage)
class CouponUsageAdmin(admin.ModelAdmin):
    list_display = ('coupon', 'user', 'order', 'discount_amount', 'used_at')
    list_filter = ('used_at', 'coupon__status')
    search_fields = ('coupon__code', 'user__username', 'order__order_id')
    readonly_fields = ('coupon', 'user', 'order', 'discount_amount', 'used_at')
    
    def has_add_permission(self, request):
        return False  # Prevent manual creation
    
    def has_change_permission(self, request, obj=None):
        return False  # Prevent editing


@admin.register(RefundLog)
class RefundLogAdmin(admin.ModelAdmin):
    list_display = ('order', 'refund_id', 'amount', 'refund_status', 'created_at')
    list_filter = ('refund_status', 'created_at')
    search_fields = ('refund_id', 'order__order_id', 'reason')
    readonly_fields = ('created_at',)
    ordering = ('-created_at',)


@admin.register(chart)
class ChartAdmin(admin.ModelAdmin):
    list_display = (
        'title', 
        'personCount', 
        'price', 
        'country', 
        'industry', 
        'employee_range', 
        'mp_status', 
        'has_preview_version',
        'creation_date',
        'get_allowed_users_count'
    )
    
    list_filter = (
        'mp_status', 
        'country', 
        'industry', 
        'has_preview_version',
        'creation_date', 
        'last_updated',
        'price'
    )
    
    search_fields = (
        'title', 
        'preview_chart_title',
        'country', 
        'industry', 
        'allowed_users__username',
        'allowed_users__email'
    )
    
    readonly_fields = ('id', 'uuid', 'creation_date', 'min_employees', 'max_employees', 'get_file_status')
    
    filter_horizontal = ('allowed_users',)
    
    list_per_page = 25
    
    ordering = ('-creation_date',)
    
    fieldsets = (
        ('Basic Information', {
            'fields': ('id','uuid', 'title', 'creation_date', 'last_updated')
        }),
        ('Chart Details', {
            'fields': ('personCount', 'departmentNames')
        }),
        ('Business Information', {
            'fields': ('country', 'industry', 'employee_range', 'min_employees', 'max_employees'),
            'description': 'Min/Max employees are automatically calculated from employee_range'
        }),
        ('Preview Version Settings', {
            'fields': ('has_preview_version', 'preview_chart_title', 'preview_notes', 'get_file_status'),
            'classes': ('collapse',),
            'description': 'Configure separate preview version for marketplace display. When enabled, upload both original and preview files with the specified titles.'
        }),
        ('Marketplace', {
            'fields': ('mp_status', 'price')
        }),
        ('Access Control', {
            'fields': ('allowed_users',),
            'classes': ('collapse',),
            'description': 'Users who have access to this chart'
        })
    )
    
    actions = ['make_published', 'make_draft', 'duplicate_chart', 'create_preview_version', 'remove_preview_version']
    
    def get_file_status(self, obj):
        """Display the status of original and preview files"""
        status_parts = []
        
        # Check original files
        if obj.original_json_file_path and os.path.exists(obj.original_json_file_path):
            status_parts.append("✅ Original JSON exists")
        else:
            status_parts.append("❌ Original JSON missing")
            
        if obj.original_csv_file_path and os.path.exists(obj.original_csv_file_path):
            status_parts.append("✅ Original CSV exists")
        else:
            status_parts.append("❌ Original CSV missing")
        
        # Check preview files if enabled
        if obj.has_preview_version:
            if obj.preview_json_file_path and os.path.exists(obj.preview_json_file_path):
                status_parts.append("✅ Preview JSON exists")
            else:
                status_parts.append("❌ Preview JSON missing")
                
            if obj.preview_csv_file_path and os.path.exists(obj.preview_csv_file_path):
                status_parts.append("✅ Preview CSV exists")
            else:
                status_parts.append("❌ Preview CSV missing")
        
        return format_html('<br/>'.join(status_parts))
    get_file_status.short_description = 'File Status'
    
    def get_allowed_users_count(self, obj):
        """Display the number of users who have access to this chart"""
        return obj.allowed_users.count()
    get_allowed_users_count.short_description = 'Users with Access'
    get_allowed_users_count.admin_order_field = 'allowed_users__count'
    
    def make_published(self, request, queryset):
        """Action to publish selected charts"""
        updated = queryset.update(mp_status='Published')
        self.message_user(request, f'{updated} charts were successfully published.')
    make_published.short_description = "Mark selected charts as Published"
    
    def make_draft(self, request, queryset):
        """Action to mark selected charts as draft"""
        updated = queryset.update(mp_status='Draft')
        self.message_user(request, f'{updated} charts were marked as Draft.')
    make_draft.short_description = "Mark selected charts as Draft"
    
    def create_preview_version(self, request, queryset):
        """Action to enable preview version for selected charts"""
        updated_count = 0
        for chart_obj in queryset:
            if not chart_obj.has_preview_version:
                chart_obj.has_preview_version = True
                if not chart_obj.preview_chart_title:
                    chart_obj.preview_chart_title = f"{chart_obj.title}_Preview"
                chart_obj.save()
                updated_count += 1
        
        self.message_user(
            request, 
            f'{updated_count} charts were configured for preview version. Upload preview files with the specified titles.',
            level='success'
        )
    create_preview_version.short_description = "Enable preview version for selected charts"
    
    def remove_preview_version(self, request, queryset):
        """Action to disable preview version for selected charts"""
        updated_count = 0
        for chart_obj in queryset:
            if chart_obj.has_preview_version:
                chart_obj.has_preview_version = False
                chart_obj.preview_chart_title = None
                chart_obj.preview_notes = None
                chart_obj.save()
                updated_count += 1
        
        self.message_user(request, f'{updated_count} charts had their preview version disabled.')
    remove_preview_version.short_description = "Disable preview version for selected charts"
    
    def duplicate_chart(self, request, queryset):
        """Action to duplicate selected charts"""
        duplicated_count = 0
        for chart_obj in queryset:
            # Create a copy of the chart
            chart_obj.pk = None  # This will create a new object
            chart_obj.id = None  # Reset UUID
            chart_obj.title = f"{chart_obj.title} (Copy)"
            chart_obj.mp_status = 'Draft'
            chart_obj.has_preview_version = False  # Don't copy preview settings
            chart_obj.preview_chart_title = None
            chart_obj.preview_notes = None
            chart_obj.save()
            duplicated_count += 1
        
        self.message_user(request, f'{duplicated_count} charts were successfully duplicated.')
    duplicate_chart.short_description = "Duplicate selected charts"
    
    def get_queryset(self, request):
        """Optimize queryset with prefetch_related for better performance"""
        queryset = super().get_queryset(request)
        return queryset.prefetch_related('allowed_users').annotate(
            users_count=models.Count('allowed_users')
        )
    
    def formfield_for_manytomany(self, db_field, request, **kwargs):
        """Customize the allowed_users field to show only active users"""
        if db_field.name == "allowed_users":
            kwargs["queryset"] = User.objects.filter(is_active=True).order_by('username')
        return super().formfield_for_manytomany(db_field, request, **kwargs)
    
    class Media:
        css = {
            'all': ('admin/css/custom_chart_admin.css',)
        }
        js = ('admin/js/chart_admin.js',)


@admin.register(MarketplaceSettings)
class MarketplaceSettingsAdmin(admin.ModelAdmin):
    list_display = ('sample_title', 'sample_description', 'is_active', 'updated_at')
    list_filter = ('is_active', 'created_at', 'updated_at')
    search_fields = ('sample_title', 'sample_description', 'sample_link')
    readonly_fields = ('created_at', 'updated_at')
    
    fieldsets = (
        ('Sample Link Configuration', {
            'fields': ('sample_link', 'sample_title', 'sample_description'),
            'description': 'Configure the free sample link displayed in the marketplace'
        }),
        ('Status', {
            'fields': ('is_active',),
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    
    def has_add_permission(self, request):
        """Only allow adding if no active settings exist"""
        return not MarketplaceSettings.objects.filter(is_active=True).exists()
    
    def has_delete_permission(self, request, obj=None):
        """Prevent deletion of the last active settings"""
        if obj and obj.is_active:
            return MarketplaceSettings.objects.filter(is_active=True).count() > 1
        return True


@admin.register(SampleRequest)
class SampleRequestAdmin(admin.ModelAdmin):
    list_display = ('email', 'chart_title', 'status', 'created_at', 'processed_by', 'processed_at', 'action_buttons')
    list_filter = ('status', 'created_at', 'processed_at', 'chart__country', 'chart__industry')
    search_fields = ('email', 'chart_title', 'requirements', 'admin_notes')
    readonly_fields = ('created_at', 'updated_at', 'processed_at')
    ordering = ('-created_at',)
    list_per_page = 25
    
    fieldsets = (
        ('Request Information', {
            'fields': ('email', 'chart', 'chart_title', 'requirements')
        }),
        ('User Information', {
            'fields': ('user',),
            'classes': ('collapse',)
        }),
        ('Status & Processing', {
            'fields': ('status', 'admin_notes', 'processed_by', 'processed_at')
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    
    def action_buttons(self, obj):
        """Display action buttons for pending requests"""
        if obj.status == 'pending':
            approve_url = reverse('admin:approve_sample_request', args=[obj.id])
            reject_url = reverse('admin:reject_sample_request', args=[obj.id])
            complete_url = reverse('admin:complete_sample_request', args=[obj.id])
            return format_html(
                '<a class="button" href="{}" style="background: #28a745; color: white; margin-right: 5px;">Approve</a>'
                '<a class="button" href="{}" style="background: #dc3545; color: white; margin-right: 5px;">Reject</a>'
                '<a class="button" href="{}" style="background: #007bff; color: white;">Complete</a>',
                approve_url, reject_url, complete_url
            )
        elif obj.status == 'approved':
            complete_url = reverse('admin:complete_sample_request', args=[obj.id])
            return format_html(
                '<a class="button" href="{}" style="background: #007bff; color: white;">Mark Complete</a>',
                complete_url
            )
        else:
            return format_html('<span style="color: #6c757d;">No actions available</span>')
    
    action_buttons.short_description = 'Actions'
    action_buttons.allow_tags = True
    
    actions = ['approve_selected', 'reject_selected', 'mark_completed']
    
    def approve_selected(self, request, queryset):
        """Bulk approve selected sample requests"""
        count = 0
        for sample_request in queryset.filter(status='pending'):
            sample_request.approve(request.user, "Bulk approved by admin")
            count += 1
        
        self.message_user(request, f'{count} sample request(s) were successfully approved.')
    approve_selected.short_description = "Approve selected sample requests"
    
    def reject_selected(self, request, queryset):
        """Bulk reject selected sample requests"""
        count = 0
        for sample_request in queryset.filter(status='pending'):
            sample_request.reject(request.user, "Bulk rejected by admin")
            count += 1
        
        self.message_user(request, f'{count} sample request(s) were successfully rejected.')
    reject_selected.short_description = "Reject selected sample requests"
    
    def mark_completed(self, request, queryset):
        """Bulk mark selected sample requests as completed"""
        count = 0
        for sample_request in queryset.filter(status__in=['pending', 'approved']):
            sample_request.complete(request.user, "Bulk completed by admin")
            count += 1
        
        self.message_user(request, f'{count} sample request(s) were successfully marked as completed.')
    mark_completed.short_description = "Mark selected requests as completed"
    
    def get_urls(self):
        urls = super().get_urls()
        custom_urls = [
            path(
                'approve/<int:request_id>/',
                self.admin_site.admin_view(self.approve_request_view),
                name='approve_sample_request',
            ),
            path(
                'reject/<int:request_id>/',
                self.admin_site.admin_view(self.reject_request_view),
                name='reject_sample_request',
            ),
            path(
                'complete/<int:request_id>/',
                self.admin_site.admin_view(self.complete_request_view),
                name='complete_sample_request',
            ),
        ]
        return custom_urls + urls
    
    def approve_request_view(self, request, request_id):
        """Approve a specific sample request"""
        try:
            sample_request = SampleRequest.objects.get(id=request_id)
            if sample_request.status == 'pending':
                sample_request.approve(request.user, f"Approved by {request.user.username}")
                messages.success(request, f'Sample request from {sample_request.email} has been approved.')
            else:
                messages.warning(request, 'This request has already been processed.')
        except SampleRequest.DoesNotExist:
            messages.error(request, 'Sample request not found.')
        except Exception as e:
            messages.error(request, f'Error approving request: {str(e)}')
        
        return HttpResponseRedirect(reverse('admin:myapp_samplerequest_changelist'))
    
    def reject_request_view(self, request, request_id):
        """Reject a specific sample request"""
        try:
            sample_request = SampleRequest.objects.get(id=request_id)
            if sample_request.status == 'pending':
                sample_request.reject(request.user, f"Rejected by {request.user.username}")
                messages.success(request, f'Sample request from {sample_request.email} has been rejected.')
            else:
                messages.warning(request, 'This request has already been processed.')
        except SampleRequest.DoesNotExist:
            messages.error(request, 'Sample request not found.')
        except Exception as e:
            messages.error(request, f'Error rejecting request: {str(e)}')
        
        return HttpResponseRedirect(reverse('admin:myapp_samplerequest_changelist'))
    
    def complete_request_view(self, request, request_id):
        """Mark a specific sample request as completed"""
        try:
            sample_request = SampleRequest.objects.get(id=request_id)
            if sample_request.status in ['pending', 'approved']:
                sample_request.complete(request.user, f"Completed by {request.user.username}")
                messages.success(request, f'Sample request from {sample_request.email} has been marked as completed.')
            else:
                messages.warning(request, 'This request cannot be marked as completed.')
        except SampleRequest.DoesNotExist:
            messages.error(request, 'Sample request not found.')
        except Exception as e:
            messages.error(request, f'Error completing request: {str(e)}')
        
        return HttpResponseRedirect(reverse('admin:myapp_samplerequest_changelist'))
    
    def get_queryset(self, request):
        """Optimize queryset with select_related"""
        return super().get_queryset(request).select_related('chart', 'user', 'processed_by')
    
    def save_model(self, request, obj, form, change):
        """Automatically set processed_by and processed_at when status changes"""
        if change:  # If editing existing record
            original_obj = SampleRequest.objects.get(pk=obj.pk)
            if original_obj.status != obj.status and obj.status != 'pending':
                if not obj.processed_by:
                    obj.processed_by = request.user
                if not obj.processed_at:
                    obj.processed_at = timezone.now()
        
        super().save_model(request, obj, form, change)