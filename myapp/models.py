from django.db import models
from django.contrib.auth.models import User
from django.utils import timezone
from datetime import timedelta
from django.utils.text import get_valid_filename
import os
from django.core.exceptions import ValidationError


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
    image = models.ImageField(upload_to='user_uploaded/user_images/')
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


