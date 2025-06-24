from django.db import models
from django.contrib.auth.models import User
from django.utils import timezone
from datetime import timedelta
from django.utils.text import get_valid_filename
import os
from django.core.exceptions import ValidationError
import uuid
from decimal import Decimal


class CompanyInfo(models.Model):
    name = models.CharField(max_length=200, default="InsideOrgs - Sphurti WebApp Pvt. Ltd.")
    address_line1 = models.CharField(max_length=200, default="House Number A2/6, Back Side of Mhada Colony, Raj Swapnpurti Elite Row,")
    address_line2 = models.CharField(max_length=200, blank=True, null=True)
    city = models.CharField(max_length=100, default="Chhatrapati Sambhajinagar")
    state = models.CharField(max_length=100, default="Maharashtra")
    country = models.CharField(max_length=100, default="India")
    postal_code = models.CharField(max_length=20, default="431002")
    phone = models.CharField(max_length=20, default="+91 86683 35926")
    email = models.EmailField(default="info@sphurti.net")
    website = models.URLField(default="https://insideorgs.sphurti.net")
    gst_number = models.CharField(max_length=15, blank=True, null=True)
    pan_number = models.CharField(max_length=10, blank=True, null=True)
    bank_name = models.CharField(max_length=100, blank=True, null=True)
    bank_account_number = models.CharField(max_length=20, blank=True, null=True)
    bank_ifsc_code = models.CharField(max_length=15, blank=True, null=True)
    is_active = models.BooleanField(default=True)
    
    class Meta:
        verbose_name = "Company Information"
        verbose_name_plural = "Company Information"
    
    def __str__(self):
        return self.name
    
    @classmethod
    def get_active_company(cls):
        """Get the active company information"""
        return cls.objects.filter(is_active=True).first()


class ChartAccess(models.Model):
    chart = models.ForeignKey('Chart', related_name='accesses', on_delete=models.CASCADE)
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    access_grant_time = models.DateTimeField(default=timezone.now)
    expiration_time = models.DateTimeField()
    
    @classmethod
    def grant_access(cls, user, chart, duration_days):
        current_datetime = timezone.now()
        expiration_time = current_datetime + timedelta(days=duration_days)
        existing_access = cls.objects.filter(user=user, chart=chart).first()
        if existing_access:
            existing_access.access_grant_time = current_datetime
            existing_access.expiration_time = expiration_time
            existing_access.save()
        else:
            access = cls(user=user, chart=chart, expiration_time=expiration_time)
            access.save()

    @classmethod
    def revoke_access(cls, user, chart):
        cls.objects.filter(user=user, chart=chart).delete()

    @classmethod
    def remove_expired_access(cls):
        current_datetime = timezone.now()
      
        expired_access = cls.objects.filter(expiration_time__lt=current_datetime)
        user_ids = list(expired_access.values_list('user_id', flat=True))
        chart_ids = list(expired_access.values_list('chart_id', flat=True))


        # Delete expired access
        expired_access.delete()

        # Pass user_ids and chart_ids to delete_user_from_allowed_users
        for user_id, chart_id in zip(user_ids, chart_ids):
            delete_user_from_allowed_users(user_id, chart_id)

def delete_user_from_allowed_users(user_id, chart_id):
    try:
        user_to_delete = User.objects.get(id=user_id)
        chart_instance = chart.objects.get(id=chart_id)
        chart_instance.allowed_users.remove(user_to_delete)
        chart_instance.save()
        
    except User.DoesNotExist:
        pass
    except chart.DoesNotExist:
        pass
    except Exception as e:
        pass


# Create your models here.
class chart(models.Model):
    uuid = models.UUIDField(unique=True, default=uuid.uuid4, editable=False)
    title = models.CharField(max_length=200)
    # author = models.CharField(max_length=100)
    creation_date = models.DateTimeField()
    # url = models.URLField(max_length=300, blank=True, null=True)
    allowed_users = models.ManyToManyField(User, related_name='allowed_charts', blank=True)
    personCount = models.IntegerField(blank=True, null=True)
    departmentNames = models.JSONField(default=list, blank=True, null=True)

    last_updated = models.DateField(blank=True, null=True)
    price = models.DecimalField(max_digits=10, decimal_places=2, blank=True, null=True)
    country = models.CharField(max_length=100, blank=True, null=True)
    industry = models.CharField(max_length=100, blank=True, null=True)
    employee_range = models.CharField(max_length=50, blank=True, null=True)
    min_employees = models.IntegerField(null=True, blank=True)
    max_employees = models.IntegerField(null=True, blank=True)
    mp_status = models.CharField(max_length=100, default='Draft', blank=True, null=True)

    def save(self, *args, **kwargs):
        if self.employee_range:
            try:
                min_employees, max_employees = map(int, self.employee_range.split('-'))
                self.min_employees = min_employees
                self.max_employees = max_employees
            except ValueError:
                # Handle the case where employee_range cannot be split into two integers
                # Optionally log the error or handle it differently
                self.min_employees = None
                self.max_employees = None
        super().save(*args, **kwargs)
        ChartAccess.remove_expired_access()


class Image(models.Model):
    image = models.ImageField(upload_to='img/user/')
    uploaded_at = models.DateTimeField(auto_now_add=True)
    
    def save(self, *args, **kwargs):
        # Get a valid filename to avoid any potential issues
        filename = get_valid_filename(self.image.name)
        # Check if the filename already exists
        if Image.objects.filter(image__icontains=filename).exists():
            # If the filename exists, add a number to make it unique
            count = 1
            while Image.objects.filter(image__icontains=f'({count})').exists():
                count += 1
            # Append the count to the filename
            filename_parts = filename.split('.')
            filename_parts.insert(-1, f'({count})')
            filename = '.'.join(filename_parts)
        # Update the image name with the modified filename
        self.image.name = filename
        super().save(*args, **kwargs)
    
    
    def filename(self):
        return os.path.basename(self.image.name)
    

class UserProfile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE)
    access_uuid = models.UUIDField(default=uuid.uuid4, unique=True)
    client_of = models.ForeignKey(User, on_delete=models.SET_NULL, blank=True, null=True, related_name='clients')
    is_superadmin = models.BooleanField(default=False)
    past_company1 = models.CharField(max_length=100, blank=True)
    past_company2 = models.CharField(max_length=100, blank=True)
    past_company3 = models.CharField(max_length=100, blank=True)
    past_company4 = models.CharField(max_length=100, blank=True)
    past_company5 = models.CharField(max_length=100, blank=True)
    educational_institute1 = models.CharField(max_length=100, blank=True)
    educational_institute2 = models.CharField(max_length=100, blank=True)
    educational_institute3 = models.CharField(max_length=100, blank=True)
    city = models.CharField(max_length=100, blank=True)
    state = models.CharField(max_length=100, blank=True)
    country = models.CharField(max_length=100, blank=True)

    def clean(self):
        # Ensure that a user cannot be their own client
        if self.client_of == self.user:
            raise ValidationError("A user cannot be their own client.")
    
    def __str__(self):
        return self.user.username


class ClientLead(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    lead_of = models.ForeignKey(User, on_delete=models.SET_NULL, blank=True, null=True, related_name='leads_of')
    revenue_share = models.DecimalField(max_digits=20, decimal_places=2, default=0.00, blank=True, null=True)
    org_name =  models.CharField(max_length=2000, blank=True)
    org_website =  models.CharField(max_length=2000, blank=True)
    designations =  models.CharField(max_length=2000, blank=True)
    dept_names =  models.CharField(max_length=2000, blank=True)
    industry_types =  models.CharField(max_length=2000, blank=True)
    locations =  models.CharField(max_length=2000, blank=True)
    total_charts = models.IntegerField(blank=True)
    required_authorities = models.IntegerField(blank=True)
    extra_insighhts = models.CharField(max_length=2000, blank=True)
    include_contacts = models.BooleanField(default=False)
    sow_status = models.CharField(max_length=100, blank=True, default='Pending')
    payment_status = models.CharField(max_length=100, blank=True, default='Pending')
    notes = models.CharField(max_length=2000, blank=True)
    emp_range = models.CharField(max_length=100, blank=True)
    entry_date = models.DateTimeField(auto_now_add=True)
    currency = models.CharField(max_length=3,blank=True)
    amount_in_currency = models.DecimalField(max_digits=20, decimal_places=2)
    amount_in_inr = models.DecimalField(max_digits=20, decimal_places=2)

    def __str__(self):
        return self.user.username


class Cart(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Cart for {self.user.username}"

    def get_total_price(self):
        return sum(item.get_total_price() for item in self.items.all())

    def get_total_items(self):
        return self.items.count()  # Count items instead of summing quantities


class CartItem(models.Model):
    cart = models.ForeignKey(Cart, related_name='items', on_delete=models.CASCADE)
    chart = models.ForeignKey(chart, on_delete=models.CASCADE)
    quantity = models.PositiveIntegerField(default=1, editable=False)  # Always 1, not editable
    added_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('cart', 'chart')

    def save(self, *args, **kwargs):
        # Always set quantity to 1
        self.quantity = 1
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.chart.title}"

    def get_total_price(self):
        return self.chart.price  # Since quantity is always 1


class Order(models.Model):
    ORDER_STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('completed', 'Completed'),
        ('failed', 'Failed'),
        ('refunded', 'Refunded'),
        ('expired', 'Expired'),
    ]
    
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='orders')
    order_id = models.CharField(max_length=100, unique=True)
    payment_id = models.CharField(max_length=100, blank=True, null=True)
    razorpay_order_id = models.CharField(max_length=100, blank=True, null=True)
    razorpay_payment_id = models.CharField(max_length=100, blank=True, null=True)
    total_amount = models.DecimalField(max_digits=10, decimal_places=2)
    base_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    processing_fee = models.DecimalField(max_digits=10, decimal_places=2, default=0, help_text="5.5% processing fee")
    billing_name = models.CharField(max_length=200, blank=True, null=True)
    billing_address = models.TextField(blank=True, null=True)
    billing_phone = models.CharField(max_length=20, blank=True, null=True)
    currency = models.CharField(max_length=3, default='USD')
    status = models.CharField(max_length=20, choices=ORDER_STATUS_CHOICES, default='pending')
    created_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='created_orders', help_text="Admin who manually created this order")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    payment_method = models.CharField(max_length=20, blank=True, null=True, default='')
    # Store purchased items as JSON for historical record
    items_data = models.JSONField(default=list)
    
    # Coupon fields
    applied_coupon = models.ForeignKey('Coupon', on_delete=models.SET_NULL, null=True, blank=True, related_name='orders')
    coupon_code = models.CharField(max_length=50, blank=True, null=True, help_text="Coupon code used (stored for historical record)")
    discount_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0, help_text="Amount discounted by coupon")
    
    class Meta:
        ordering = ['-created_at']
    
    def __str__(self):
        return f"Order {self.order_id} - ${self.total_amount}"
    
    @property
    def customer_name(self):
        return f"{self.user.first_name} {self.user.last_name}".strip() or self.user.username
    
    @property
    def customer_email(self):
        return self.user.email


class OrderItem(models.Model):
    order = models.ForeignKey(Order, on_delete=models.CASCADE, related_name='order_items')
    chart = models.ForeignKey(chart, on_delete=models.CASCADE)
    price_at_purchase = models.DecimalField(max_digits=10, decimal_places=2)
    chart_title_at_purchase = models.CharField(max_length=200)  # Store title at time of purchase
    
    def __str__(self):
        return f"{self.chart_title_at_purchase} - ${self.price_at_purchase}"


class CustomerInfo(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='customer_info')
    company_name = models.CharField(max_length=200, blank=True, null=True)
    address_line1 = models.CharField(max_length=200, blank=True, null=True)
    address_line2 = models.CharField(max_length=200, blank=True, null=True)
    city = models.CharField(max_length=100, blank=True, null=True)
    state = models.CharField(max_length=100, blank=True, null=True)
    country = models.CharField(max_length=100, blank=True, null=True)
    postal_code = models.CharField(max_length=20, blank=True, null=True)
    phone = models.CharField(max_length=20, blank=True, null=True)
    
    class Meta:
        verbose_name = "Customer Information"
        verbose_name_plural = "Customer Information"
    
    def __str__(self):
        return f"{self.company_name or 'No Company'} - {self.user.username}"

    @property
    def full_address(self):
        """Return formatted full address"""
        parts = [self.address_line1]
        if self.address_line2:
            parts.append(self.address_line2)
        if self.city:
            parts.append(self.city)
        if self.state:
            parts.append(self.state)
        if self.country:
            parts.append(self.country)
        if self.postal_code:
            parts.append(self.postal_code)
        return ", ".join(filter(None, parts))


class Coupon(models.Model):
    DISCOUNT_TYPE_CHOICES = [
        ('percentage', 'Percentage'),
        ('fixed', 'Fixed Amount'),
    ]
    
    COUPON_STATUS_CHOICES = [
        ('active', 'Active'),
        ('inactive', 'Inactive'),
        ('expired', 'Expired'),
    ]
    
    code = models.CharField(max_length=50, unique=True, help_text="Coupon code (case-insensitive)")
    name = models.CharField(max_length=200, help_text="Internal name for the coupon")
    description = models.TextField(blank=True, null=True, help_text="Description of the coupon offer")
    
    # Discount settings
    discount_type = models.CharField(max_length=10, choices=DISCOUNT_TYPE_CHOICES, default='percentage')
    discount_value = models.DecimalField(max_digits=10, decimal_places=2, help_text="Percentage (0-100) or fixed amount")
    
    # Usage limitations
    max_uses = models.PositiveIntegerField(null=True, blank=True, help_text="Maximum number of times this coupon can be used (leave blank for unlimited)")
    max_uses_per_user = models.PositiveIntegerField(default=1, help_text="Maximum uses per user")
    current_uses = models.PositiveIntegerField(default=0, help_text="Current number of times this coupon has been used")
    
    # Amount limitations
    minimum_order_amount = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True, help_text="Minimum order amount required")
    maximum_discount_amount = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True, help_text="Maximum discount amount (for percentage coupons)")
    
    # Date limitations
    valid_from = models.DateTimeField(help_text="When the coupon becomes valid")
    valid_until = models.DateTimeField(help_text="When the coupon expires")
    
    # User limitations
    allowed_users = models.ManyToManyField(User, blank=True, help_text="Specific users who can use this coupon (leave blank for all users)")
    new_users_only = models.BooleanField(default=False, help_text="Only available to users who haven't made a purchase before")    
    # Chart limitations
    applicable_charts = models.ManyToManyField(chart, blank=True, help_text="Specific charts this coupon applies to (leave blank for all charts)")
    
    # Status and metadata
    status = models.CharField(max_length=10, choices=COUPON_STATUS_CHOICES, default='active')
    created_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='created_coupons')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['-created_at']
        verbose_name = "Coupon"
        verbose_name_plural = "Coupons"
    
    def __str__(self):
        return f"{self.code} - {self.get_discount_display()}"
    
    def clean(self):
        # Validate discount value based on discount type
        if self.discount_type == 'percentage' and (self.discount_value < 0 or self.discount_value > 100):
            raise ValidationError({'discount_value': 'Percentage discount must be between 0 and 100.'})
        elif self.discount_type == 'fixed' and self.discount_value < 0:
            raise ValidationError({'discount_value': 'Fixed discount amount cannot be negative.'})
        
        # Validate date range
        if self.valid_from and self.valid_until and self.valid_from >= self.valid_until:
            raise ValidationError({'valid_until': 'Valid until date must be after valid from date.'})
    
    def save(self, *args, **kwargs):
        # Convert code to uppercase for consistency
        self.code = self.code.upper()
        super().save(*args, **kwargs)
    
    def get_discount_display(self):
        if self.discount_type == 'percentage':
            return f"{self.discount_value}% off"
        else:
            return f"${self.discount_value} off"
    
    def is_valid(self, user=None, order_amount=None, charts=None):
        """Check if coupon is valid for use"""
        now = timezone.now()
        
        # Check basic status and date validity
        if self.status != 'active':
            return False, "Coupon is not active"
        
        if now < self.valid_from:
            return False, "Coupon is not yet valid"
        
        if now > self.valid_until:
            return False, "Coupon has expired"
        
        # Check usage limits
        if self.max_uses and self.current_uses >= self.max_uses:
            return False, "Coupon usage limit reached"
        
        # Check user-specific validations
        if user:
            # Check if user is allowed to use this coupon
            if self.allowed_users.exists() and user not in self.allowed_users.all():
                return False, "You are not eligible to use this coupon"
            
            # Check new users only restriction
            if self.new_users_only and user.orders.filter(status='completed').exists():
                return False, "This coupon is only available for new customers"
            
            # Check per-user usage limit
            user_usage_count = CouponUsage.objects.filter(coupon=self, user=user).count()
            if user_usage_count >= self.max_uses_per_user:
                return False, f"You have already used this coupon {self.max_uses_per_user} time(s)"
        
        # Check minimum order amount
        if order_amount and self.minimum_order_amount:
            if order_amount < self.minimum_order_amount:
                return False, f"Minimum order amount of ${self.minimum_order_amount} required"
        
        # Check chart applicability
        if charts and self.applicable_charts.exists():
            applicable_chart_ids = set(self.applicable_charts.values_list('id', flat=True))
            cart_chart_ids = set(chart.id for chart in charts)
            if not cart_chart_ids.issubset(applicable_chart_ids):
                return False, "One or more charts in your cart are not eligible for this coupon"
        
        return True, "Coupon is valid"
    
    def calculate_discount(self, order_amount):
        """Calculate the discount amount for given order amount"""
        if self.discount_type == 'percentage':
            discount = (order_amount * self.discount_value) / Decimal('100')
            # Apply maximum discount limit if set
            if self.maximum_discount_amount:
                discount = min(discount, self.maximum_discount_amount)
        else:
            discount = self.discount_value
        
        # Ensure discount doesn't exceed order amount
        return min(discount, order_amount)


class CouponUsage(models.Model):
    coupon = models.ForeignKey(Coupon, on_delete=models.CASCADE, related_name='usages')
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    order = models.ForeignKey(Order, on_delete=models.CASCADE, null=True, blank=True)
    discount_amount = models.DecimalField(max_digits=10, decimal_places=2)
    used_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        verbose_name = "Coupon Usage"
        verbose_name_plural = "Coupon Usages"
        unique_together = ['coupon', 'order']  # Prevent duplicate usage on same order
    
    def __str__(self):
        return f"{self.user.username} used {self.coupon.code} - ${self.discount_amount}"


class RefundLog(models.Model):
    order = models.ForeignKey(Order, on_delete=models.CASCADE)
    refund_id = models.CharField(max_length=100)
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    reason = models.CharField(max_length=500, blank=True, null=True)
    refund_status = models.CharField(max_length=50)
    created_at = models.DateTimeField(auto_now_add=True)
