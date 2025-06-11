from django.shortcuts import render, redirect, get_object_or_404
from django.http import HttpResponse, Http404,HttpResponseBadRequest
from django.template import loader
from django.contrib.auth.models import User, Group
from django.contrib.auth.hashers import make_password
from django.contrib import messages
from django.core.mail import EmailMessage, send_mail
from django.core.exceptions import PermissionDenied
from django.core.files.storage import FileSystemStorage
from django.conf import settings
from django.contrib.sites.shortcuts import get_current_site
from django.template.loader import render_to_string
from django.utils.http import urlsafe_base64_decode, urlsafe_base64_encode
from django.utils.encoding import force_bytes, force_str
from django.contrib.auth import authenticate, login, logout
from django.contrib.auth.tokens import default_token_generator, PasswordResetTokenGenerator #reset function 
from django.utils import timezone
from django.contrib.auth.decorators import login_required, user_passes_test
from django.views.decorators.http import require_POST 
from . tokens import generate_token
import os, json, shutil, csv, re, subprocess
import numpy as np
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from .code.generate_org import generate_org
from .models import chart, ChartAccess, Image, UserProfile, ClientLead
from datetime import timedelta, datetime
from django.utils.dateparse import parse_date
import paypalrestsdk
from django.urls import reverse
import requests
import uuid


# Create your views here.

@login_required
def home(request):
    if request.user.userprofile.is_superadmin or request.user.groups.filter(name='Admin').exists(): 
        charts = chart.objects.all()
        users = User.objects.filter(groups__name="Subscriber")
    elif request.user.groups.filter(name='Sales Partner').exists():
        users = User.objects.filter(userprofile__client_of=request.user).order_by('-date_joined')
        charts = chart.objects.filter(allowed_users__in=users)
    else:    
        charts = chart.objects.filter(allowed_users=request.user)
        users = None

    totalpersonCount = 0
    totaldepartmentCount = 0
    totalorgchartCount = 0
    common_department_names = [
    "Human Resources (HR)",
    "Account",
    "Finance",
    "Marketing",
    "Sales",
    "Information Technology (IT)",
    "Operations",
    "Customer Service",
    "Research and Development (R&D)",
    "Legal",
    "Administration",
    "Procurement",
    "Quality Assurance (QA)",
    "Production",
    "Supply Chain",
    "Public Relations (PR)",
    "Facilities Management",
    "Compliance",
    "Project Management",
    "Business Development",
    "Communications"
    ]
    matched_categories = set()
    for i in charts:
        json_items = json.loads(i.departmentNames)
        for item in json_items:
            words = item.split()
            # Check if any word in the item matches any category
            for word in words:
                if word in common_department_names and word not in matched_categories:
                    # Add the matched category to the set
                    matched_categories.add(word)
        totalpersonCount+= i.personCount
    totaldepartmentCount += len(matched_categories)
    totalorgchartCount += len(charts)
    return render(request, "index.html", {"totaldepartmentCount": totaldepartmentCount, "totalpersonCount":totalpersonCount, "totalorgchartCount":totalorgchartCount, "users": users})

def signup(request):
    if request.method == "POST":
        username = request.POST['username']
        fname = request.POST['fname']
        lname = request.POST['lname']
        email = request.POST['email']
        pass1 = request.POST['pass1']
        pass2 = request.POST['pass2']
        
        if User.objects.filter(username=username):
            messages.error(request, "Username already exist! Please try some other username.")
            return redirect('signup')
        
        if User.objects.filter(email=email).exists():
            messages.error(request, "Email Already Registered!!")
            return redirect('signup')
        
        if len(username)>20:
            messages.error(request, "Username must be under 20 charcters!!")
            return redirect('signup')
        
        if pass1 != pass2:
            messages.error(request, "Passwords didn't matched!!")
            return redirect('signup')
        
        if not username.isalnum():
            messages.error(request, "Username must be Alpha-Numeric!!")
            return redirect('signup')
        
        myuser = User.objects.create_user(username, email, pass1)
        myuser.first_name = fname
        myuser.last_name = lname
        # myuser.is_active = False
        myuser.is_active = False
        myuser.save()
        demo_charts = chart.objects.filter(title__icontains='demo')
        for demo_chart in demo_charts:
            demo_chart.allowed_users.add(myuser)
            demo_chart.save()
        user_profile = UserProfile(user=myuser)
        user_profile.is_superadmin = False
        user_profile.save()
        subscriber_group, _ = Group.objects.get_or_create(name='Subscriber')
        myuser.groups.add(subscriber_group)
        messages.success(request, "Your Account has been created succesfully!! Please check your email to confirm your email address in order to activate your account.")
        
        # Welcome Email
        subject = "Account Created Succesfully!!"
        message = "Hello " + myuser.first_name + "!! \n" + "\nThank you for visiting our website\n. We have also sent you a confirmation email, please confirm your email address. \n\nThanking You\nTeam OrgChart"        
        from_email = settings.EMAIL_SENDER_ID
        to_list = [myuser.email]
        send_mail(subject, message, from_email, to_list, fail_silently=True)
        
        # Email Address Confirmation Email
        current_site = get_current_site(request)
        email_subject = "Confirm your Email Login!!"
        message2 = render_to_string('email_confirmation.html',{
            
            'name': myuser.first_name,
            'domain': current_site.domain,
            'uid': urlsafe_base64_encode(force_bytes(myuser.pk)),
            'token': generate_token.make_token(myuser)
        })
        email = EmailMessage(
        email_subject,
        message2,
        settings.EMAIL_SENDER_ID,
        [myuser.email],
        )
        email.fail_silently = True
        email.send()
        
        return redirect('signin')
        
        
    return render(request, "authentication/signup.html")


def activate(request,uidb64,token):
    try:
        uid = force_str(urlsafe_base64_decode(uidb64))
        myuser = User.objects.get(pk=uid)
    except (TypeError,ValueError,OverflowError,User.DoesNotExist):
        myuser = None

    if myuser is not None and generate_token.check_token(myuser,token):
        myuser.is_active = True
        # user.profile.signup_confirmation = True
        myuser.save()
        login(request,myuser)
        messages.success(request, "Your Account has been activated!! Please log in with your credentials")
        return redirect('signin')
    else:
        return render(request,'activation_failed.html')


def signin(request):
    if request.method == 'POST':
        username = request.POST['username']
        pass1 = request.POST['pass1']
        
        user = authenticate(username=username, password=pass1)
        
        if user is not None:
            login(request, user)
            fname = user.first_name
            try:
                user_profile = UserProfile.objects.get(user=user)
            except UserProfile.DoesNotExist:
                # If UserProfile doesn't exist, create a blank profile for the user
                user_profile = UserProfile(user=user)
                user_profile.is_superadmin = False  # Assuming default value
                user_profile.save()
            return redirect('home')
        else:
            messages.error(request, "Bad Credentials!!")
            return redirect('signin')
    
    return render(request, "authentication/signin.html")

@login_required
def signout(request):
    logout(request)
    messages.success(request, "Logged Out Successfully!!")
    return redirect('signin')



class ExpiringTokenGenerator(PasswordResetTokenGenerator):
    def make_token(self, user):
        token = super().make_token(user)
        expiration_time = timezone.localtime(timezone.now()) + timedelta(hours=24)
        expiration_time = expiration_time.replace(microsecond=0)
        return f"{token}.{expiration_time.timestamp()}"

expiring_token_generator = ExpiringTokenGenerator()

def password_reset_request(request):
    if request.method == "POST":
        email = request.POST.get('email')
        pattern = r'^[\w\.-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9\.]+$'
        if not re.match(pattern, email):
            messages.error(request, "Please enter a valid email address!")
            return redirect('password_reset')


        user = User.objects.filter(email=email).first()
        
        if user:
            token = expiring_token_generator.make_token(user)
            uid = urlsafe_base64_encode(force_bytes(user.pk))
            reset_link = f"{request.scheme}://{request.get_host()}/reset-password/{uid}/{token}/"
            send_password_reset_email(user, email, reset_link)
            messages.success(request, "Password reset email sent.")
            return render(request, 'password_reset/password_reset.html', {'title':'Password Reset Request Sent'})
        else:
            messages.error(request, "User with this email address does not exist.")
            return redirect('password_reset')
    
    return render(request, 'password_reset/password_reset.html', {'title':'Password Reset'})


def password_reset_confirm(request, uidb64, token):
    try:
        uid = force_str(urlsafe_base64_decode(uidb64))
        user = User.objects.get(pk=uid)
    except (TypeError, ValueError, OverflowError, User.DoesNotExist):
        user = None

    if user and token_valid(user,token):
        if request.method == "POST":
            password = request.POST.get('password')
            confirmpassword = request.POST.get('confirmPassword')

            if password != confirmpassword:
                messages.error(request, "Your passwords does not match!")
                return render(request, 'password_reset/password_reset_confirm.html',{'title': 'Password Reset'})

            pattern = r'^(?=.*[A-Z])(?=.*[a-z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$'
            if not re.match(pattern, password):
                messages.error(request, "Please Choose a Strong Password!")
                messages.info(request, "Choose a password with: &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<br/><br/>At least 8 characters. <br/><br/>At least one uppercase letter.<br/>At least one lowercase letter. <br/>At least one digit. <br/>At least one special character")
                return render(request, 'password_reset/password_reset_confirm.html',{'title': 'Password Reset'}) 



            user.set_password(password)
            user.save()
            messages.success(request, "Your password has been reset successfully.")
            return render(request, 'password_reset/password_reset_confirm.html',{'title': 'Password Reset Complete'})
        return render(request, 'password_reset/password_reset_confirm.html',{'title': 'Password Reset'})
    else:
        print("invalid links")
        messages.error(request, "The password reset link is invalid or expired.")
        return redirect('password_reset')

def token_valid(user,token):
    parts = token.split('.')
    if len(parts) != 3:
        return False
    
    try:
        expiration_timestamp = float(parts[1])
    except ValueError:
        return False
    
    expiration_datetime = datetime.fromtimestamp(expiration_timestamp)
    if expiration_datetime <= timezone.localtime(timezone.now()).replace(tzinfo=None):
        return False
    token_without_exp = parts[0]
    return expiring_token_generator.check_token(user, token_without_exp)


def send_password_reset_email(user, email, reset_link):
    subject = 'Password Reset Request'
    message = render_to_string('password_reset/password_reset_email.html', {'reset_link': reset_link,'user_obj':user})
    send_mail(subject, message, settings.EMAIL_SENDER_ID, [email])



@user_passes_test(lambda user: user.is_staff and user.groups.filter(name='Admin'))
def createorgchart(request):
    charts = chart.objects.order_by('-creation_date')[:5]
    available_users = User.objects.filter(is_staff=False)
    try:
        access_key = UserProfile.objects.get(user=request.user).access_uuid  
    except UserProfile.DoesNotExist:
        access_key = None
    return render(request, "create_orgchart.html",{'charts': charts,'available_users':available_users,'access_key':access_key})


@login_required
def listorgchart(request):
    current_datetime = timezone.localtime(timezone.now())
    is_staff = request.user.is_staff
    try:
        access_key = UserProfile.objects.get(user=request.user).access_uuid  
    except UserProfile.DoesNotExist:
        access_key = None
    ChartAccess.remove_expired_access()
    if request.user.userprofile.is_superadmin or request.user.groups.filter(name='Admin').exists():
        charts_data = [{'chart': chart, 'creation_time': chart.creation_date} for chart in chart.objects.all()]

    else:
        demo_charts = chart.objects.filter(title__icontains='demo')
        for demo_chart in demo_charts:
            demo_chart.allowed_users.add(request.user)
            demo_chart.save()
        # Retrieve charts accessible to the current user
        charts_with_access = chart.objects.filter(allowed_users=request.user)

        # Prepare data for rendering
        charts_data = []
        for chart_obj in charts_with_access:
            access = chart_obj.accesses.filter(user=request.user).first()
            if access:
                access_grant_time = access.access_grant_time
                expiration_time = access.expiration_time
                days_remaining = max((expiration_time - current_datetime).days, 0)
            else:
                access_grant_time = None
                expiration_time = None
                days_remaining = None

            charts_data.append({
                'chart': chart_obj,
                'access_grant_time': access_grant_time,
                'expiration_time': expiration_time,
                'days_remaining': days_remaining
            })

    return render(request, "list_orgchart.html", {'charts_data': charts_data, 'access_key':access_key})

@login_required
def myaccount(request):
    user = request.user
    return render(request, "myaccount.html",{ 'user': user})

def view_404(request, exception=None):
    # make a redirect to homepage
    return redirect('home')

@csrf_exempt
def upload_csv(request):
    if request.method == "POST" and request.FILES.get("csv_file"):
        csv_file = request.FILES["csv_file"]
        user_id = request.POST.get("user_profile")
        user = User.objects.get(id=user_id)
        selected_user, created = UserProfile.objects.get_or_create(user=user)
        
        if not csv_file.name.endswith('.csv'):
            return JsonResponse({"error": "Invalid file type. Please select a CSV file."}, status=500)
        
        title = csv_file.name.rsplit('.', 1)[0]
        chart_obj = chart.objects.all()
        for chart_title in chart_obj:
            if(chart_title.title==title):
                result=False
                return JsonResponse({'error': "Chart or title name already exists"}, status=500)
        # Process the CSV file (e.g., parse and store data)
        org_template = "org_template.html"
        full_html_file_path = os.path.join("myapp", "templates", org_template)
        result, personCount, departmentNames, nodes_json = generate_org(csv_file,full_html_file_path, title,  selected_user)
        run_collectstatic()
        if not result:
            return JsonResponse({'error': "Invalid Binding recheck your data"}, status=500)
        
        # pass it to the server
        def convert_numpy(obj):
            if isinstance(obj, (np.integer, np.int64, np.int32)):
                return int(obj)
            elif isinstance(obj, (np.floating, np.float64, np.float32)):
                return float(obj)
            elif isinstance(obj, np.ndarray):
                return obj.tolist()
            else:
                return str(obj) 
        if result:
            payload = {
                "title": title,
                "personCount": personCount,
                "nodes_json": json.loads(json.dumps(nodes_json, default=convert_numpy))  # Should be serializable (list or JSON string)
            }
            # Create the `chart_data` directory if it doesn't exist
            chart_data_dir = os.path.join(settings.MEDIA_ROOT, "chart_data")
            os.makedirs(chart_data_dir, exist_ok=True)

            def is_title_safe(title):
                # Allow only alphanumeric characters, underscore, dash, and space
                allowed_chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789_- "
                return all(char in allowed_chars for char in title)
            # Generate safe filename
            if not is_title_safe(title):
                return JsonResponse({'message': 'Title contains invalid characters. Allowed: letters, numbers, space, _, -'}, status=400)
            filename = f"{title}.json"
            file_path = os.path.join(chart_data_dir, filename)

            # Save the JSON data to the file
            with open(file_path, "w", encoding="utf-8") as f:
                json.dump(payload, f, indent=4, ensure_ascii=False)

            print(f"Chart data saved to: {file_path}")

            
            custom_directory = "csv_files"
            # Construct the path to the file to be deleted
            file_path = os.path.join(settings.MEDIA_ROOT, custom_directory)
            fs = FileSystemStorage(location=file_path)
            filename = fs.save(csv_file.name, csv_file)

            # You can also get the URL of the saved file
            
            # print(file_url)
            # print(personCount, len(np.array(json.loads(departmentNames))))
            current_datetime = timezone.localtime(timezone.now())
            formatted_datetime = current_datetime.strftime(r"%Y-%m-%d %H:%M:%S")
            chart(title=title, creation_date=formatted_datetime, personCount=personCount, departmentNames=departmentNames).save()

            
            response_data = {"message": "CSV file uploaded and processed successfully"}
            return JsonResponse(response_data)

    else:
    # Handle other HTTP methods or no file provided
        return JsonResponse({"message": "Invalid request"}, status=400)
    

# def serve_file(request, file_name):
#     access=False
#     title, _ = os.path.splitext(file_name)
#     if request.user.is_authenticated:
#         user_id = request.user.id
#         # chart_id = get_object_or_404(chart, title=title)
#         user = User.objects.get(id=user_id)
#         chart_ids = chart.objects.filter(allowed_users=user)
#         if (user.is_staff and user.groups.filter(name='Admin')):
#             access=True
#         for charts in chart_ids:
#             if (charts.title==title):
#                 access=True
#     #making sphurti chart link public
#     if 'demo' in file_name.lower():
#         access =True
#     if access:
#         # Specify the directory where the files are stored
#         file_path = os.path.join(settings.BASE_DIR,'myapp','templates','orgcharts', file_name)
        

#         # Check if the file exists
#         if os.path.exists(file_path):
#             template = loader.get_template(f"orgcharts/{file_name}")

#             # Render the HTML file as a web page
#             rendered_html = template.render()

#             # Return the rendered HTML as an HTTP response
#             return HttpResponse(rendered_html)

#         # Return a 404 Not Found response if the file doesn't exist
#         from django.http import Http404
#         raise Http404("File not found")
#     else:
#         return HttpResponse(status=403)
#         # raise HttpResponse(content="Forbidden Access")

@require_POST
@csrf_exempt
def serve_file(request):
    access = False
    data = json.loads(request.body)
    # Get user_id and file_name from POST data (or request.GET if you prefer GET)
    raw_user_id  = data.get('user_id')
    file_name = data.get('file_name')
    file_name = file_name.strip('"').strip()
    if not raw_user_id  or not file_name:
        return JsonResponse({'message': 'Missing user_id or file_name'}, status=200)
    try:
        user_id_str = raw_user_id.strip('"').strip()
        access_id = uuid.UUID(user_id_str)  # ensure it's a string
    except (ValueError, TypeError) as e:
        return JsonResponse({'access': False, 'message': 'Invalid UserId', 'details': str(e)}, status=200)
    

    title, _ = os.path.splitext(file_name)

    try:
        userobj = UserProfile.objects.get(access_uuid=access_id).user
    except UserProfile.DoesNotExist:
        return JsonResponse({'access': False, 'message': 'User not found'}, status=200)

    if 'demo' in file_name.lower():
        access = True
    elif userobj.is_staff and userobj.groups.filter(name='Admin').exists():
        access = True
    else:
        chart_ids = chart.objects.filter(allowed_users=userobj)
        for charts in chart_ids:
            if charts.title == title:
                access = True
                break
    if '/' in file_name or '..' in file_name:
        return JsonResponse({'access': False, 'message': 'Invalid Company Name'}, status=200)

    full_filename = f"{file_name}.json"

    # Construct full file path
    file_path = os.path.join(settings.MEDIA_ROOT, 'chart_data', full_filename)

    # Check file existence
    if not os.path.exists(file_path):
        return JsonResponse({'access': False, 'message': 'File not found.'}, status=404)
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            data = json.load(f)
        return JsonResponse({'access': access,'chart_title':title, 'nodes_data':data['nodes_json']}, status=200)
    except json.JSONDecodeError:
        return JsonResponse({'access': False, 'message': 'Failed to parse JSON.'}, status=500)

    

@user_passes_test(lambda user: user.is_staff and user.groups.filter(name='Admin'))
def delete_file(request, pk):
    try:
        charts = chart.objects.get(pk=pk)
    except chart.DoesNotExist:
        return JsonResponse({'error': "Chart not found"}, status=404)
    
    try: 
        # deleting csv file
        custom_directory = "csv_files"
        json_directory = "chart_data"
        json_filename = f"{charts.title}.json"  
        csv_filename = f"{charts.title}.csv"
        # html_filename = f"{charts.title}.html"
        # save_path = os.path.join(settings.BASE_DIR, 'myapp','templates','orgcharts')
        # Construct the path to the file to be deleted
        csv_file_path = os.path.join(custom_directory, csv_filename)
        output_csv_path = os.path.join("output_csv", csv_filename)
        json_file_path = os.path.join(json_directory, json_filename)

        # html_file_path = os.path.join(save_path, html_filename)
        # Create a FileSystemStorage instance
        fs = FileSystemStorage(location=settings.MEDIA_ROOT)

        # Check if the file exists before attempting to delete
        if fs.exists(csv_file_path):
            fs.delete(csv_file_path)
        if fs.exists(output_csv_path):
            fs.delete(output_csv_path)
        if fs.exists(json_file_path):
            fs.delete(json_file_path)
        # if os.path.isfile(html_file_path):
        #     os.remove(html_file_path)
        
        charts.delete()
        current_url = request.META.get('HTTP_REFERER')
    except:
        return JsonResponse({'error': "Error Deleting the Chart File"}, status=500)
        # Redirect the user back to the current page
    return redirect(current_url)
    
@user_passes_test(lambda user: user.is_staff and user.groups.filter(name='Admin'))
def manage_access(request):
    if request.method == 'POST':
        try:
            chart_ids = request.POST.getlist('chart_ids')
            user_id = request.POST.get('user')
            operation = request.POST.get('operation')
            duration_days = int(request.POST.get('duration', 30))

            user = User.objects.get(pk=user_id)
            for chart_id in chart_ids:
                chart_obj = chart.objects.get(pk=chart_id)
                if operation == 'add':
                    # Grant access for the specified duration
                    ChartAccess.grant_access(user, chart_obj, duration_days)
                    chart_obj.allowed_users.add(user) #need to update
                elif operation == 'remove':
                    # Remove access for the user
                    ChartAccess.revoke_access(user, chart_obj)
                    chart_obj.allowed_users.remove(user) #need to update


            messages.success(request, 'Action successful!')
        except Exception as e:
            messages.error(request, f'{e} Action failed.')  # Optional error message
            
        current_url = request.META.get('HTTP_REFERER')
        return redirect(current_url)

    # If the request method is not POST, render the form
    available_charts = chart.objects.all()
    available_users = User.objects.filter(is_staff=False)
    ChartAccess.remove_expired_access()
    context = {
        'available_charts': available_charts,
        'available_users': available_users,
    }

    return render(request, 'manage_orgcharts.html', context)



@login_required
def view_access(request):
    ChartAccess.remove_expired_access()
    if request.user.userprofile.is_superadmin or request.user.groups.filter(name='Admin').exists():
        available_users = User.objects.all()
    else: 
        available_users = User.objects.filter(userprofile__client_of=request.user)
    if request.method == "POST":
        user_id = request.POST.get('user_id')
        user_per = User.objects.get(id=user_id)
        charts_with_access = chart.objects.filter(allowed_users=user_per)
        current_datetime = timezone.localtime(timezone.now())
            # Prepare data for rendering
        charts_data = []
        for chart_obj in charts_with_access:
            access = chart_obj.accesses.filter(user=user_per).first()
            if access:
                access_grant_time = access.access_grant_time
                expiration_time = access.expiration_time
                days_remaining = max((expiration_time - current_datetime).days, 0)
            else:
                access_grant_time = None
                expiration_time = None
                days_remaining = None

            charts_data.append({
                'chart': chart_obj,
                'access_grant_time': access_grant_time,
                'expiration_time': expiration_time,
                'days_remaining': days_remaining
            })
        return render(request, 'permitted_orgcharts.html', {'charts_data': charts_data,'user_per':user_per,'available_users': available_users})
    
    return render(request,'permitted_orgcharts.html',{'available_users': available_users})
@login_required
def download_all_csv(request):
    if request.user.userprofile.is_superadmin or request.user.groups.filter(name='Admin').exists():
        src_folder = os.path.join(settings.MEDIA_ROOT,"csv_files")
        charts = chart.objects.all()
    else:
        src_folder = os.path.join(settings.MEDIA_ROOT,"output_csv")
        charts = chart.objects.filter(allowed_users=request.user)
    # Create a temporary directory to store individual CSV files
    temp_dir = '/tmp/csv_temp_dir'  # Adjust the location as needed
    os.makedirs(temp_dir, exist_ok=True)

    try:
        # Copy each CSV file to the temporary directory
        for chart_ind in charts:
            src_file_path = os.path.join(src_folder,f"{chart_ind.title}.csv")
            dst_file_path = os.path.join(temp_dir, f"{chart_ind.title}.csv")
            shutil.copy2(src_file_path, dst_file_path)

        # Create a zip file containing all CSV files
        zip_file_path = '/tmp/csv_files.zip'  # Adjust the location as needed
        shutil.make_archive(zip_file_path[:-4], 'zip', temp_dir)

        # Serve the zip file as a response
        with open(zip_file_path, 'rb') as zip_file:
            response = HttpResponse(zip_file.read(), content_type='application/zip')
            response['Content-Disposition'] = 'attachment; filename="all_charts.zip"'
            return response
    finally:
        # Clean up: remove the temporary directory and its contents
        shutil.rmtree(temp_dir, ignore_errors=True)

@login_required
def download_source(request, chart_id):
    if request.user.userprofile.is_superadmin or request.user.groups.filter(name='Admin').exists():
        chart_instance = get_object_or_404(chart, pk=chart_id)
    else:
        chart_instance = get_object_or_404(chart, pk=chart_id, allowed_users=request.user)

    file_path = os.path.join(settings.MEDIA_ROOT,"csv_files",f"{chart_instance.title}.csv")

    # Check if the file exists
    if os.path.exists(file_path):
        with open(file_path, 'rb') as csv_file:
            response = HttpResponse(csv_file.read(), content_type='text/csv')
            response['Content-Disposition'] = f'attachment; filename="{chart_instance.title}.csv"'
            return response
    else:
        raise Http404("CSV file not found")

@login_required
@user_passes_test(lambda user: user.is_staff and user.groups.filter(name='Admin'))
def upload_image(request):
    if request.method == 'POST':
        image_files = request.FILES.getlist('images')
        for image_file in image_files:
            image_instance = Image(image=image_file)
            image_instance.save()
        run_collectstatic()
        return redirect('upload_image')
    
    images = Image.objects.all().order_by('-uploaded_at')
    image_count = images.count()
    return render(request, 'upload_image.html', {'images': images,'image_count':image_count})


@require_POST
@user_passes_test(lambda user: user.is_staff and user.groups.filter(name='Admin'))
def delete_images(request):
    data = json.loads(request.body)
    image_ids = data.get('image_ids', [])
    try:    
        for image_id in image_ids:
            # Assuming Image model has a field named 'image' which stores the image path
            image_id = 'user_uploaded/user_images/' + image_id  
            image = get_object_or_404(Image, image=image_id)
            image_path = image.image.path
            # print(image_path)
            
            # Delete the image from the media directory
            if os.path.exists(image_path):
                os.remove(image_path)
            new_image_path = image_path.replace(os.sep + 'media' + os.sep + 'user_uploaded' + os.sep, os.sep + 'static' + os.sep )
            if os.path.exists(new_image_path):
                os.remove(new_image_path)
            
            # Delete the image from the database
            image.delete()

        return JsonResponse({'message': 'Images deleted successfully'})
    except Exception as e:
        return JsonResponse({'message': f'Error deleting images{e}'})

@csrf_exempt 
@user_passes_test(lambda user: user.is_staff and user.groups.filter(name='Admin'))
def export_image_urls(request):
    if request.method == 'POST':
        data = json.loads(request.body)
        selected_image_ids = data.get('image_ids', [])
        
       # Prepend 'user_uploaded/' to each image_id
        selected_image_ids = ['user_uploaded/user_images/' + image_id for image_id in selected_image_ids]
        
        # Fetch selected images from the database based on image IDs
        images = Image.objects.filter(image__in=selected_image_ids)
        
        response = HttpResponse(content_type='text/csv')
        response['Content-Disposition'] = 'attachment; filename="selected_image_urls.csv"'

        writer = csv.writer(response)
        writer.writerow(['Title', 'Image URL'])  # Write header row

        for image in images:
            # Get the image ID (filename)
            image_title = image.filename()
            # Construct the full image URL
            image_url = request.build_absolute_uri(image.image.url)
            image_url = image_url.replace('/media/user_uploaded/', '/static/')
            image_url = image_url.replace('http://', 'https://')
            writer.writerow([image_title, image_url])  # Write image ID and image URL for each image


        return response
    else:
        return HttpResponse(status=405)

def run_collectstatic():
    try:
        subprocess.check_call(['python3', 'manage.py', 'collectstatic', '--noinput'])
        return True  # Collectstatic command executed successfully
    except subprocess.CalledProcessError as e:
        return False  # Error occurred while executing collectstatic command

@user_passes_test(lambda user: user.is_staff)
def view_profile(request):
    available_users = User.objects.filter(is_staff=False) # Fetch all users
    selected_user = None
    # if request.method == 'POST':
    #     user_id = request.POST.get('user_id')  # Assuming 'username' is the name of your select box field
    #     user = User.objects.get(id=user_id)
    #     selected_user, created = UserProfile.objects.get_or_create(user=user)
    #     if created:
    #         selected_user.past_company1 = ""
    #         selected_user.past_company2 = ""
    #         # Initialize other fields similarly
    #         selected_user.save()
        # return render(request, 'profile.html', {'user_profile': user_profile})
    
    return render(request, 'profile.html', {'available_users': available_users, 'selected_user': selected_user,'edit_mode':False})


@user_passes_test(lambda user: user.is_staff and user.groups.filter(name='Admin'))
def edit_profile(request):
    available_users = User.objects.filter(is_staff=False)
    if request.method == 'POST':
        if request.POST.get('edit_form') == 'True': 
            user_id = request.POST.get('user_id')
            selected_user = None

            if user_id:
                user = User.objects.get(id=user_id)
                selected_user, created = UserProfile.objects.get_or_create(user=user)
                if created:

                    selected_user.past_company1 = ""
                    selected_user.past_company2 = ""
                    # Initialize other fields similarly
                    selected_user.save()
                # Handle form submission and update profile fields manually
        else:
            user_id = request.POST.get('user_id')
            user = User.objects.get(id=user_id)
            selected_user, created = UserProfile.objects.get_or_create(user=user)
            selected_user.past_company1 = request.POST.get('past_company1')
            selected_user.past_company2 = request.POST.get('past_company2')
            selected_user.past_company3 = request.POST.get('past_company3')
            selected_user.past_company4 = request.POST.get('past_company4')
            selected_user.past_company5 = request.POST.get('past_company5')
            selected_user.educational_institute1 = request.POST.get('educational_institute1')
            selected_user.educational_institute2 = request.POST.get('educational_institute2')
            selected_user.educational_institute3 = request.POST.get('educational_institute3')
            selected_user.city = request.POST.get('city')
            selected_user.state = request.POST.get('state')
            selected_user.country = request.POST.get('country')
            # Update other fields similarly
            
            # Save the updated profile
            selected_user.save()
            
        return render(request, 'profile.html', {'available_users': available_users, 'selected_user': selected_user, 'edit_mode': True})
    
    return redirect('view_profile')
    # return render(request, 'profile.html', {'available_users': available_users, 'selected_user': selected_user, 'edit_mode': True})

@login_required
def request_orgchart(request):
    success_message = None
    if request.method == 'POST':
        industry_type = request.POST.get('industry_type')
        company_name = request.POST.get('company_name')
        department_name = request.POST.get('department_name')
        designation = request.POST.get('designation')
        company_websites = request.POST.get('company_url')
        location = request.POST.get('location')
        required_authorities = request.POST.get('required_authorities')
        extra_insights = request.POST.get('extra_insights')
        number_inclusion = request.POST.get('number_inclusion') == 'on'
        try:
            myuser = User.objects.get(pk=request.user.id)
            subject = "New OrgChart Request!!"
            user_message = f""" Hello {myuser.first_name}!! \n\nWe have succesfully receieved your request regarding orgcharts. \nWe will be looking forward to get in touch with you as soon as possible

            You have submitted the following:
            Industry Type(s) : {industry_type} 
            Organization Name(s)  : {company_name} 
            Department Name(s) : {department_name} 
            Designation(s) : {designation} 
            Organization Website(s) : {company_websites} 
            Location(s) : {location}
            Required Authorities : {required_authorities} 
            Include Direct Numbers :  {"Yes" if number_inclusion else "No"}
            Any Other Insight(s) :  {extra_insights}

            If you have any queries regarding this email, Please contact us!
            \n\nThanking You\nTeam InsideOrgs
            """
            from_email = settings.EMAIL_SENDER_ID
            to_list = [myuser.email]
            send_mail(subject, user_message, from_email, to_list, fail_silently=True)

            admin_message = f""" Hello Admin!! \n\nWe have receieved an Orgchart(s) request through our application. \nPlease look forward into it!

            User Name : {myuser.first_name}

            User have submitted the following:
            Industry Type(s) : {industry_type} 
            Organization Name(s)  : {company_name} 
            Department Name(s) : {department_name} 
            Designation(s) : {designation} 
            Organization Website(s) : {company_websites} 
            Location(s) : {location}
            Required Authorities : {required_authorities} 
            Include Direct Numbers :  {"Yes" if number_inclusion else "No"}
            Any Other Insight(s) :  {extra_insights}
            """
            to_list = [settings.EMAIL_SENDER_ID]
            send_mail(subject, admin_message, from_email, to_list, fail_silently=True)
            messages.success(request, "Form submitted successfully!")
            return redirect('request_orgchart')
        except Exception as e:
            messages.error(request, "An error occurred during form submission. Please try again.")



    return render(request, 'request_orgchart.html',{'success_message': success_message})


@user_passes_test(lambda user: user.is_staff)
def client_details(request):
    if request.method == 'POST':
        try:
            industry_type = request.POST.get('industry_type')
            company_name = request.POST.get('company_name')
            department_name = request.POST.get('department_name')
            designation = request.POST.get('designation')
            company_websites = request.POST.get('company_url')
            location = request.POST.get('location')
            required_authorities = request.POST.get('required_authorities')
            extra_insights = request.POST.get('extra_insights')
            number_inclusion = request.POST.get('number_inclusion') == 'on'
            client_user_id = request.POST.get('client_user')
            employee_range = request.POST.get('employee_range')
            total_charts_access = request.POST.get('total_charts_access')
            currency = request.POST.get('currency')
            amt_in_currency = request.POST.get('value_in_currency')
            amt_in_inr = request.POST.get('value_in_inr')

            # Retrieve selected user (client)
            client_user = User.objects.get(id=client_user_id)

            if client_user:
                client = ClientLead(
                    user=client_user,
                    lead_of = request.user,
                    org_name = company_name ,
                    org_website =  company_websites,
                    designations =  designation,
                    dept_names =  department_name,
                    industry_types =  industry_type,
                    locations =  location,
                    total_charts = total_charts_access,
                    required_authorities = required_authorities,
                    extra_insighhts = extra_insights,
                    include_contacts = number_inclusion,
                    emp_range = employee_range,
                    currency = currency,
                    amount_in_currency = amt_in_currency,
                    amount_in_inr = amt_in_inr,
                )
                client.save()
                messages.success(request,'Entry Saved Successfully!')
            return redirect('client_details')
        except:
            messages.error(request,'Some Error Occured!')
            return redirect('client_details')
    try:
        if request.user.userprofile.is_superadmin:
            available_users = UserProfile.objects.all()
        else:      
            # Filter clients based on the retrieved UserProfile
            available_users = UserProfile.objects.filter(client_of=request.user)
    except UserProfile.DoesNotExist:
        available_users = None
    # available_users = User.objects.filter(is_staff=False)
    return render(request,'client_details_form.html', {'available_users': available_users })

@user_passes_test(lambda user: user.is_staff)
def client_details_show(request):
    try:
        if request.user.userprofile.is_superadmin:
            leads_data = ClientLead.objects.all()
        else:
            leads_data = ClientLead.objects.filter(lead_of=request.user)
    except  ClientLead.DoesNotExist:
        leads_data  = None
    return render(request,'client_details_show.html', {'leads_data':leads_data })

@user_passes_test(lambda user: user.is_staff)
def update_lead_status(request, lead_id):
    try:
        lead = get_object_or_404(ClientLead, pk=lead_id)
        if request.method == 'POST':
            if 'revenue_share' in request.POST:
                revenue_share = float(request.POST['revenue_share'])
                lead.revenue_share = revenue_share
                lead.save()
            else:
                new_sow = request.POST.get('sow_status')
                new_payment = request.POST.get('payment_status')
                notes = request.POST.get('notes')
                lead.sow_status, lead.payment_status, lead.notes = new_sow, new_payment, notes
                lead.save()

            return redirect('client_details_show')
    except Exception as e:
        return redirect('client_details_show')
    return redirect('client_details_show')

@user_passes_test(lambda user: user.userprofile.is_superadmin)
def delete_lead(request, lead_id):
    try:
        lead = get_object_or_404(ClientLead, pk=lead_id)
        lead.delete()
        return redirect('client_details_show')  
    except ClientLead.DoesNotExist:
        return redirect('client_details_show')  
    except Exception as e:
        return redirect('client_details_show')  
    
@user_passes_test(lambda user: user.userprofile.is_superadmin)
def assign_client_to_user(request):
    if request.method == 'POST':
        user_id = request.POST.get('user')
        client_id = request.POST.get('client')
        action = request.POST.get('action')
        clients_list = None
        if action == 'assign':
            if user_id == client_id:
                messages.error(request,"User and client cannot be the same. Please select different users." ) 
            else:
                try:
                    salesuser = User.objects.get(pk=user_id)
                    client = User.objects.get(pk=client_id)

                    # Assign client to user
                    client_profile, created = UserProfile.objects.get_or_create(user=client)
                    client_profile.client_of = salesuser 
                    client_profile.save()

                    messages.success(request, f"Client '{client.username}' assigned to user '{salesuser.username}' successfully.")
                except User.DoesNotExist:
                    messages.error(request,"Invalid user or client selected.") 

        elif action == 'remove':
            try:
                client = User.objects.get(pk=client_id)
                salesuser = User.objects.get(pk=user_id)
                # Remove client from the user's profile
                client_profile = UserProfile.objects.get(user=client)
                client_profile.client_of = None
                client_profile.save()

                messages.success(request, f"Client removed successfully from user '{salesuser.username}'.")
            except (User.DoesNotExist, UserProfile.DoesNotExist):
                messages.error(request, "Invalid user selected.")
        
        elif action == 'view':
            try:
                salesuser = User.objects.get(pk=user_id)
                clients_list = UserProfile.objects.filter(client_of=salesuser)
            except (User.DoesNotExist, UserProfile.DoesNotExist):
                messages.error(request, "Invalid user selected.")
        # Re-render the form with error message
        users = User.objects.filter(is_staff=True)
        clients = User.objects.filter(is_staff=False)  # Exclude selected user from clients
        return render(request, 'assign_clients.html', {'users': users, 'clients': clients,'clients_list':clients_list, 'salesuser':salesuser})

    else:
        # Render the form for GET requests
        users = User.objects.filter(is_staff=True)
        clients = User.objects.filter(is_staff=False)
        return render(request, 'assign_clients.html', {'users': users, 'clients': clients,'clients_list':None})


@user_passes_test(lambda user: user.userprofile.is_superadmin)
def user_operations(request):
    if request.method == 'POST':
        operation = request.POST.get('operation')

        if operation == 'create_user':
            # Process user creation
            username = request.POST.get('username')
            password = request.POST.get('password')
            if username and password:
                if User.objects.filter(username=username):
                    messages.error(request, "Username already exist! Please try some other username.")
                    return redirect('user_operations')
                
                if len(username)>20:
                    messages.error(request, "Username must be under 20 charcters!!")
                    return redirect('user_operations')
                
                if not username.isalnum():
                    messages.error(request, "Username must be Alpha-Numeric!!")
                    return redirect('user_operations')


                # Create user with hashed password
                user = User.objects.create(username=username, password=make_password(password))
                user_profile = UserProfile(user=user)
                user_profile.is_superadmin = False
                user_profile.save()
                demo_charts = chart.objects.filter(title__icontains='demo')
                for demo_chart in demo_charts:
                    demo_chart.allowed_users.add(user)
                    demo_chart.save()
                user.groups.add(Group.objects.get(name='Subscriber'))
                # Optionally, you can redirect to a success URL
                messages.success(request,'User Created Successfully!')
                return redirect('user_operations')

        elif operation == 'deactivate_user':
            # Process user deactivation
            user_id = request.POST.get('user_id')
            if user_id:
                try:
                    user = User.objects.get(pk=user_id)
                    user.is_active = False
                    user.save()
                    # Optionally, you can redirect to a success URL
                    messages.success(request,'User Deactivated Successfully')
                    return redirect('user_operations')
                except User.DoesNotExist:
                    # Handle the case where user ID does not exist
                    pass  # Redirect or render an error message

        elif operation == 'assign_user_groups':
            # Process user group assignment
            user_id = request.POST.get('user')
            group_id = request.POST.get('groups')
            if user_id and group_id:
                try:
                    user = User.objects.get(pk=user_id)
                    user.groups.set(group_id)
                    group = Group.objects.get(pk=group_id) 
                    if group.name =='Admin' or group.name=='Sales Partner':
                        user.is_staff = True
                    else:
                        user.is_staff = False
                    user.save()
                    # Optionally, you can redirect to a success URL
                    messages.success(request,'User Modified Successfully!')
                    return redirect('user_operations')
                except User.DoesNotExist:
                    # Handle the case where user ID does not exist
                    pass  # Redirect or render an error message

    # Fetch users and groups to populate select options
    users = User.objects.all()
    groups = Group.objects.all()

    return render(request, 'user_operations.html', {'users': users, 'groups': groups})


def filter_users_by_group(request):
    if request.method == 'GET' and request.headers.get('x-requested-with') == 'XMLHttpRequest':
        group_id = request.GET.get('group_id')
        print(group_id)
        if group_id:
            # Retrieve users belonging to the selected group
            users = User.objects.filter(groups__id=group_id)

            # Prepare data to send back as JSON
            users_data = [{'id': user.id, 'username': user.username} for user in users]

            return JsonResponse({'users': users_data})
    
    # If no valid data or request method, return empty response or error
    return JsonResponse({'error': 'Invalid request'}, status=400)




@login_required
def check_login(request):
    return JsonResponse({'isLoggedIn': True})

def marketplace_dash(request):
    for company in chart.objects.all():
        # print(company.min_employees, company.max_employees)
        company.save()  # This will trigger the updated save method
    # charts_data = [{'chart': chart, 'last_updated': chart.last_updated, } for chart in chart.objects.all()]
    charts_data = chart.objects.all()


    return render(request, 'marketplace.html', {'charts_data':charts_data})



def create_payment(request, chart_id):
    selected_chart = get_object_or_404(chart, pk=chart_id)

    paypalrestsdk.configure({
        "mode": settings.PAYPAL_ENVIRONMENT,
        "client_id": settings.PAYPAL_CLIENT_ID,
        "client_secret": settings.PAYPAL_CLIENT_SECRET,
    })

    payment = paypalrestsdk.Payment({
        "intent": "sale",
        "payer": {
            "payment_method": "paypal"
        },
        "redirect_urls": {
            "return_url": request.build_absolute_uri(reverse('execute_payment')),
            "cancel_url": request.build_absolute_uri(reverse('payment_cancel')),
        },
        "transactions": [{
            "item_list": {
                "items": [{
                    "name": selected_chart.title,
                    "sku": str(selected_chart.id),
                    "price":  "{:.2f}".format(selected_chart.price),  # Set your price here
                    "currency": "USD",
                    "quantity": 1
                }]
            },
            "amount": {
                "total": "{:.2f}".format(selected_chart.price),
                "currency": "USD"
            },
            "description": f"Purchase for {selected_chart.title}."
        }]
    })

    if payment.create():
        for link in payment.links:
            if link.rel == "approval_url":
                approval_url = str(link.href)
                return redirect(approval_url)
    else:
        print(payment.error)
        return JsonResponse({"Paymentfailed":"failed"})


def execute_payment(request):
    payment_id = request.GET.get('paymentId')
    payer_id = request.GET.get('PayerID')

    payment = paypalrestsdk.Payment.find(payment_id)

    if payment.execute({"payer_id": payer_id}):

        transaction = payment.transactions[0]
        amount = transaction.amount.total
        currency = transaction.amount.currency
        sku = transaction.item_list.items[0].sku
        item_name = transaction.item_list.items[0].name
        item_list = transaction.item_list
        items = item_list.items

        # Extract customer details
        customer_email = payment.payer.payer_info.email
        customer_name = payment.payer.payer_info.first_name

        # Assuming there's only one item for simplicity
        item_sku = items[0].sku  # Get the SKU of the first item
        chart_obj = chart.objects.get(pk=item_sku)
        user = User.objects.get(pk=request.user.id)

        # Grant access for the specified duration
        ChartAccess.grant_access(user, chart_obj, 30)
        chart_obj.allowed_users.add(user)


        #send payment receipt to customer on email
        # Format the receipt email
        subject = "Payment Receipt from Sphurti WebApp Pvt. Ltd."
        message = (
            f"Dear {customer_name},\n\n"
            f"Thank you for your purchase!\n\n"
            f"Transaction Details:\n"
            f"-----------------------------------\n"
            f"Item: OrgChart - {item_name}\n"
            f"SKU: {sku}\n"
            f"Amount: {amount} {currency}\n"
            f"Transaction ID: {payment_id}\n"
            f"Date: {transaction.create_time}\n\n"
            f"Best regards,\n"
            f"Sphurti WebApp Pvt. Ltd.\n"
            f"info@sphurti.net"
        )

        # Send the receipt email
        send_mail(
            subject,
            message,
            settings.EMAIL_SENDER_ID,  # From email
            [customer_email],          # To email
            fail_silently=False,
        )
        # update your company's purchase status here
        return redirect('payment_success')
    else:
        print(payment.error)
        return redirect('payment_cancel')

def payment_success(request):
    # You can retrieve additional information here, such as the payment details or update records
    return redirect('listorgchart')

def payment_cancel(request):
    return redirect('marketplace_dash')

@user_passes_test(lambda user: user.userprofile.is_superadmin)
def admin_marketplace(request):
    charts_data = chart.objects.all()
    countries = [
    "Afghanistan", "Albania", "Algeria", "American Samoa", "Andorra", "Angola", "Anguilla", "Antarctica",
    "Antigua and Barbuda", "Argentina", "Armenia", "Aruba", "Australia", "Austria", "Azerbaijan", "Bahamas",
    "Bahrain", "Bangladesh", "Barbados", "Belarus", "Belgium", "Belize", "Benin", "Bermuda", "Bhutan", "Bolivia",
    "Bosnia and Herzegovina", "Botswana", "Brazil", "British Indian Ocean Territory", "British Virgin Islands",
    "Brunei", "Bulgaria", "Burkina Faso", "Burundi", "Cambodia", "Cameroon", "Canada", "Cape Verde", "Cayman Islands",
    "Central African Republic", "Chad", "Chile", "China", "Christmas Island", "Cocos Islands", "Colombia", "Comoros",
    "Cook Islands", "Costa Rica", "Croatia", "Cuba", "Curacao", "Cyprus", "Czech Republic", "Democratic Republic of the Congo",
    "Denmark", "Djibouti", "Dominica", "Dominican Republic", "East Timor", "Ecuador", "Egypt", "El Salvador",
    "Equatorial Guinea", "Eritrea", "Estonia", "Ethiopia", "Falkland Islands", "Faroe Islands", "Fiji", "Finland",
    "France", "French Polynesia", "Gabon", "Gambia", "Georgia", "Germany", "Ghana", "Gibraltar", "Greece", "Greenland",
    "Grenada", "Guam", "Guatemala", "Guernsey", "Guinea", "Guinea-Bissau", "Guyana", "Haiti", "Honduras", "Hong Kong",
    "Hungary", "Iceland", "India", "Indonesia", "Iran", "Iraq", "Ireland", "Isle of Man", "Israel", "Italy", "Ivory Coast",
    "Jamaica", "Japan", "Jersey", "Jordan", "Kazakhstan", "Kenya", "Kiribati", "Kosovo", "Kuwait", "Kyrgyzstan", "Laos",
    "Latvia", "Lebanon", "Lesotho", "Liberia", "Libya", "Liechtenstein", "Lithuania", "Luxembourg", "Macau", "Macedonia",
    "Madagascar", "Malawi", "Malaysia", "Maldives", "Mali", "Malta", "Marshall Islands", "Mauritania", "Mauritius",
    "Mayotte", "Mexico", "Micronesia", "Moldova", "Monaco", "Mongolia", "Montenegro", "Montserrat", "Morocco", "Mozambique",
    "Myanmar", "Namibia", "Nauru", "Nepal", "Netherlands", "Netherlands Antilles", "New Caledonia", "New Zealand",
    "Nicaragua", "Niger", "Nigeria", "Niue", "North Korea", "Northern Mariana Islands", "Norway", "Oman", "Pakistan",
    "Palau", "Palestine", "Panama", "Papua New Guinea", "Paraguay", "Peru", "Philippines", "Pitcairn", "Poland",
    "Portugal", "Puerto Rico", "Qatar", "Republic of the Congo", "Reunion", "Romania", "Russia", "Rwanda",
    "Saint Barthelemy", "Saint Helena", "Saint Kitts and Nevis", "Saint Lucia", "Saint Martin", "Saint Pierre and Miquelon",
    "Saint Vincent and the Grenadines", "Samoa", "San Marino", "Sao Tome and Principe", "Saudi Arabia", "Senegal", "Serbia",
    "Seychelles", "Sierra Leone", "Singapore", "Sint Maarten", "Slovakia", "Slovenia", "Solomon Islands", "Somalia",
    "South Africa", "South Korea", "South Sudan", "Spain", "Sri Lanka", "Sudan", "Suriname", "Svalbard and Jan Mayen",
    "Swaziland", "Sweden", "Switzerland", "Syria", "Taiwan", "Tajikistan", "Tanzania", "Thailand", "Togo", "Tokelau",
    "Tonga", "Trinidad and Tobago", "Tunisia", "Turkey", "Turkmenistan", "Turks and Caicos Islands", "Tuvalu",
    "U.S. Virgin Islands", "Uganda", "Ukraine", "United Arab Emirates", "United Kingdom", "United States", "Uruguay",
    "Uzbekistan", "Vanuatu", "Vatican", "Venezuela", "Vietnam", "Wallis and Futuna", "Western Sahara", "Yemen", "Zambia", "Zimbabwe"
    ]
    industries = [
    "Accounting", "Airlines/Aviation", "Alternative Dispute Resolution", "Alternative Medicine", "Animation",
    "Apparel & Fashion", "Architecture & Planning", "Arts and Crafts", "Automotive", "Aviation & Aerospace",
    "Banking", "Biotechnology", "Broadcast Media", "Building Materials", "Business Supplies and Equipment",
    "Capital Markets", "Chemicals", "Civic & Social Organization", "Civil Engineering", "Commercial Real Estate",
    "Computer & Network Security", "Computer Games", "Computer Hardware", "Computer Networking", "Computer Software",
    "Construction", "Consumer Electronics", "Consumer Goods", "Consumer Services", "Cosmetics", "Dairy", "Defense & Space",
    "Design", "E-Learning", "Education Management", "Electrical/Electronic Manufacturing", "Entertainment",
    "Environmental Services", "Events Services", "Executive Office", "Facilities Services", "Farming", "Financial Services",
    "Fine Art", "Fishery", "Food & Beverages", "Food Production", "Fund-Raising", "Furniture", "Gambling & Casinos",
    "Glass, Ceramics & Concrete", "Government Administration", "Government Relations", "Graphic Design",
    "Health, Wellness and Fitness", "Higher Education", "Hospital & Health Care", "Hospitality", "Human Resources",
    "Import and Export", "Individual & Family Services", "Industrial Automation", "Information Services",
    "Information Technology and Services", "Insurance", "International Affairs", "International Trade and Development",
    "Internet", "Investment Banking", "Investment Management", "Judiciary", "Law Enforcement", "Law Practice",
    "Legal Services", "Legislative Office", "Leisure, Travel & Tourism", "Libraries", "Logistics and Supply Chain",
    "Luxury Goods & Jewelry", "Machinery", "Management Consulting", "Maritime", "Market Research", "Marketing and Advertising",
    "Mechanical or Industrial Engineering", "Media Production", "Medical Devices", "Medical Practice", "Mental Health Care",
    "Military", "Mining & Metals", "Motion Pictures and Film", "Museums and Institutions", "Music", "Nanotechnology",
    "Newspapers", "Nonprofit Organization Management", "Oil & Energy", "Online Media", "Outsourcing/Offshoring",
    "Package/Freight Delivery", "Packaging and Containers", "Paper & Forest Products", "Performing Arts", "Pharmaceuticals",
    "Philanthropy", "Photography", "Plastics", "Political Organization", "Primary/Secondary Education", "Printing",
    "Professional Training & Coaching", "Program Development", "Public Policy", "Public Relations and Communications",
    "Public Safety", "Publishing", "Railroad Manufacture", "Ranching", "Real Estate", "Recreational Facilities and Services",
    "Religious Institutions", "Renewables & Environment", "Research", "Restaurants", "Retail", "Security and Investigations",
    "Semiconductors", "Shipbuilding", "Sporting Goods", "Sports", "Staffing and Recruiting", "Supermarkets",
    "Telecommunications", "Textiles", "Think Tanks", "Tobacco", "Translation and Localization", "Transportation/Trucking/Railroad",
    "Urgent Care", "Utilities", "Venture Capital & Private Equity", "Veterinary", "Warehousing", "Wholesale", "Wine and Spirits",
    "Wireless", "Writing and Editing"
    ]
    employee_ranges = [
    "1-10",
    "11-50",
    "51-200",
    "201-500",
    "501-1000",
    "1001-5000",
    "5001-10000",
    "10001+"
    ]
    return render(request, 'admin_marketplace.html', {'charts_data':charts_data, 'industries':industries, 'countries':countries, 'employee_ranges':employee_ranges})

@require_POST
def update_chart(request, chart_id):
    selected_chart = get_object_or_404(chart, id=chart_id)

    price = request.POST.get('price')
    last_updated = parse_date(request.POST.get('last_updated'))
    country = request.POST.get('country')
    industry = request.POST.get('industry')
    employee_range = request.POST.get('employee_range')
    status = request.POST.get('status')

    # Update chart fields with the new data
    selected_chart.price = price
    selected_chart.last_updated = last_updated
    selected_chart.country = country
    selected_chart.industry = industry
    selected_chart.employee_range = employee_range
    selected_chart.mp_status = status

    # Save the updated chart
    selected_chart.save()

    messages.success(request, 'Chart details updated successfully!')
    return redirect('admin_marketplace')  # Replace 'chart-list' with the name of your chart listing view

