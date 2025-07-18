import os
import json
import csv
import re
from django.core.management.base import BaseCommand
from django.conf import settings
from myapp.models import chart


class Command(BaseCommand):
    help = 'Generate blurred preview data from original chart data'

    def add_arguments(self, parser):
        parser.add_argument(
            '--chart-id',
            type=int,
            help='Specific chart ID to process',
        )
        parser.add_argument(
            '--all',
            action='store_true',
            help='Process all charts that have preview version enabled',
        )

    def handle(self, *args, **options):
        if options['chart_id']:
            try:
                chart_obj = chart.objects.get(id=options['chart_id'])
                self.process_chart(chart_obj)
            except chart.DoesNotExist:
                self.stdout.write(
                    self.style.ERROR(f'Chart with ID {options["chart_id"]} not found')
                )
        elif options['all']:
            charts = chart.objects.filter(has_preview_version=True)
            self.stdout.write(f'Processing {charts.count()} charts with preview version enabled...')
            for chart_obj in charts:
                self.process_chart(chart_obj)
        else:
            self.stdout.write(
                self.style.ERROR('Please specify either --chart-id or --all')
            )

    def process_chart(self, chart_obj):
        """Process a single chart to create blurred preview data"""
        self.stdout.write(f'Processing chart: {chart_obj.title}')
        
        if not chart_obj.has_preview_version:
            self.stdout.write(
                self.style.WARNING(f'  Skipping - preview version not enabled')
            )
            return
        
        if not chart_obj.preview_chart_title:
            self.stdout.write(
                self.style.WARNING(f'  Skipping - no preview chart title set')
            )
            return

        # Process JSON file
        if chart_obj.original_json_file_path and os.path.exists(chart_obj.original_json_file_path):
            self.create_blurred_json(chart_obj)
        else:
            self.stdout.write(
                self.style.WARNING(f'  Original JSON file not found')
            )

        # Process CSV file
        if chart_obj.original_csv_file_path and os.path.exists(chart_obj.original_csv_file_path):
            self.create_blurred_csv(chart_obj)
        else:
            self.stdout.write(
                self.style.WARNING(f'  Original CSV file not found')
            )

    def create_blurred_json(self, chart_obj):
        """Create blurred JSON file from original"""
        try:
            with open(chart_obj.original_json_file_path, 'r', encoding='utf-8') as f:
                original_data = json.load(f)
            
            # Create blurred version
            blurred_data = self.blur_json_data(original_data)
            
            # Ensure preview directory exists
            preview_dir = os.path.dirname(chart_obj.preview_json_file_path)
            os.makedirs(preview_dir, exist_ok=True)
            
            # Save blurred version
            with open(chart_obj.preview_json_file_path, 'w', encoding='utf-8') as f:
                json.dump(blurred_data, f, indent=2, ensure_ascii=False)
            
            self.stdout.write(
                self.style.SUCCESS(f'  ✅ Created preview JSON: {chart_obj.preview_chart_title}.json')
            )
            
        except Exception as e:
            self.stdout.write(
                self.style.ERROR(f'  ❌ Error creating preview JSON: {str(e)}')
            )

    def create_blurred_csv(self, chart_obj):
        """Create blurred CSV file from original"""
        try:
            blurred_rows = []
            
            with open(chart_obj.original_csv_file_path, 'r', encoding='utf-8') as f:
                reader = csv.DictReader(f)
                headers = reader.fieldnames
                
                for row in reader:
                    blurred_row = self.blur_csv_row(row)
                    blurred_rows.append(blurred_row)
            
            # Ensure preview directory exists
            preview_dir = os.path.dirname(chart_obj.preview_csv_file_path)
            os.makedirs(preview_dir, exist_ok=True)
            
            # Save blurred version
            with open(chart_obj.preview_csv_file_path, 'w', encoding='utf-8', newline='') as f:
                if headers and blurred_rows:
                    writer = csv.DictWriter(f, fieldnames=headers)
                    writer.writeheader()
                    writer.writerows(blurred_rows)
            
            self.stdout.write(
                self.style.SUCCESS(f'  ✅ Created preview CSV: {chart_obj.preview_chart_title}.csv')
            )
            
        except Exception as e:
            self.stdout.write(
                self.style.ERROR(f'  ❌ Error creating preview CSV: {str(e)}')
            )

    def blur_json_data(self, data):
        """Apply blurring to JSON data"""
        if isinstance(data, dict):
            blurred_data = {}
            for key, value in data.items():
                if key == 'nodes_json' and isinstance(value, list):
                    blurred_data[key] = [self.blur_node(node) for node in value]
                else:
                    blurred_data[key] = self.blur_json_data(value)
            return blurred_data
        elif isinstance(data, list):
            return [self.blur_json_data(item) for item in data]
        else:
            return data

    def blur_node(self, node):
        """Blur sensitive data in a node"""
        if not isinstance(node, dict):
            return node
        
        blurred_node = node.copy()
        
        # Fields to blur partially
        name_fields = ['name', 'full_name', 'employee_name']
        email_fields = ['email', 'email_id', 'email_address']
        phone_fields = ['phone', 'phone_number', 'mobile', 'contact_number', 'boardline_number']
        id_fields = ['employee_id', 'personal_number', 'badge_id']
        
        # Blur names (keep first and last letter, replace middle with *)
        for field in name_fields:
            if field in blurred_node and blurred_node[field]:
                blurred_node[field] = self.blur_name(blurred_node[field])
        
        # Blur emails (keep domain, blur username)
        for field in email_fields:
            if field in blurred_node and blurred_node[field]:
                blurred_node[field] = self.blur_email(blurred_node[field])
        
        # Blur phone numbers
        for field in phone_fields:
            if field in blurred_node and blurred_node[field]:
                blurred_node[field] = self.blur_phone(blurred_node[field])
        
        # Blur ID numbers
        for field in id_fields:
            if field in blurred_node and blurred_node[field]:
                blurred_node[field] = self.blur_id(blurred_node[field])
        
        # Blur LinkedIn profiles
        if 'linkedin' in blurred_node and blurred_node['linkedin']:
            blurred_node['linkedin'] = 'https://linkedin.com/in/***'
        
        return blurred_node

    def blur_csv_row(self, row):
        """Blur sensitive data in a CSV row"""
        blurred_row = row.copy()
        
        # Apply same blurring logic as JSON
        for key, value in row.items():
            if not value:
                continue
                
            key_lower = key.lower()
            
            if any(name_field in key_lower for name_field in ['name', 'employee']):
                blurred_row[key] = self.blur_name(value)
            elif any(email_field in key_lower for email_field in ['email', 'mail']):
                blurred_row[key] = self.blur_email(value)
            elif any(phone_field in key_lower for phone_field in ['phone', 'mobile', 'contact', 'boardline']):
                blurred_row[key] = self.blur_phone(value)
            elif any(id_field in key_lower for id_field in ['id', 'number']) and key_lower != 'phone_number':
                blurred_row[key] = self.blur_id(value)
            elif 'linkedin' in key_lower:
                blurred_row[key] = 'https://linkedin.com/in/***'
        
        return blurred_row

    def blur_name(self, name):
        """Blur name keeping first and last letters"""
        if not name or len(name) <= 2:
            return '***'
        
        words = name.split()
        blurred_words = []
        
        for word in words:
            if len(word) <= 2:
                blurred_words.append('*' * len(word))
            elif len(word) == 3:
                blurred_words.append(word[0] + '*' + word[-1])
            else:
                blurred_words.append(word[0] + '*' * (len(word) - 2) + word[-1])
        
        return ' '.join(blurred_words)

    def blur_email(self, email):
        """Blur email keeping domain"""
        if '@' not in email:
            return '***@***.com'
        
        username, domain = email.split('@', 1)
        if len(username) <= 2:
            blurred_username = '***'
        else:
            blurred_username = username[0] + '***'
        
        return f'{blurred_username}@{domain}'

    def blur_phone(self, phone):
        """Blur phone number"""
        # Keep country code and replace middle digits
        phone_clean = re.sub(r'[^\d+]', '', phone)
        if len(phone_clean) <= 4:
            return '***'
        
        if phone_clean.startswith('+'):
            return phone_clean[:3] + '*' * (len(phone_clean) - 6) + phone_clean[-3:]
        else:
            return phone_clean[:2] + '*' * (len(phone_clean) - 4) + phone_clean[-2:]

    def blur_id(self, id_value):
        """Blur ID numbers"""
        if len(str(id_value)) <= 2:
            return '***'
        
        id_str = str(id_value)
        return id_str[0] + '*' * (len(id_str) - 2) + id_str[-1]
