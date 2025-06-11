from django.contrib import admin
from django.urls import path, include
from . import views
from django.contrib.auth import views as auth_views
from django.views.generic import TemplateView
from django.conf import settings
from django.conf.urls.static import static




urlpatterns = [
    path('', views.home, name='home'),
    path('signup', views.signup, name='signup'),
    path('activate/<uidb64>/<token>', views.activate, name='activate'),
    path('signin', views.signin, name='signin'),
    path('signout', views.signout, name='signout'),
    path('reset-password/', views.password_reset_request, name='password_reset'),
    path('reset-password/<uidb64>/<token>/', views.password_reset_confirm, name='password_reset_confirm'),
    path('org/create', views.createorgchart, name='createorgchart'),
    path('org/list', views.listorgchart, name='listorgchart'),
    path('myaccount', views.myaccount, name='myaccount'),
    path("upload_csv/", views.upload_csv, name="upload_csv"),
    # path('charts/<str:file_name>', views.serve_file, name='serve_file'),
    path('api/request/chart/', views.serve_file, name='serve_file'), #for access managmeent
    path('delete/<int:pk>/', views.delete_file, name='delete_file'),
    path('org/manage', views.manage_access, name='manage_access'),
    path('org/access', views.view_access, name='view_access'),
    path('upload_image', views.upload_image, name='upload_image'),
    path('delete_images', views.delete_images, name='delete_images'),
    path('export_image_urls', views.export_image_urls, name='export_image_urls'),
    path('download-all-csv', views.download_all_csv, name='download_all_csv'),
    path('download-source/<int:chart_id>/', views.download_source, name='download_source'),
    path('profile', views.view_profile, name='view_profile'),
    path('edit-profile/', views.edit_profile, name='edit_profile'),
    path('org/request', views.request_orgchart, name='request_orgchart'),
    path('client/details/add', views.client_details, name='client_details'),
    path('client/details/show', views.client_details_show, name='client_details_show'),
    path('lead/<int:lead_id>/update', views.update_lead_status, name='update_lead_status'),
    path('lead/<int:lead_id>/delete', views.delete_lead, name='delete_lead'),
    path('client/lead/assign', views.assign_client_to_user, name='assign_client_to_user'),
    path('user/operations', views.user_operations, name='user_operations'),
    path('user/filter', views.filter_users_by_group, name='filter_users_by_group'), 
    path('marketplace', views.marketplace_dash, name='marketplace_dash'),
    path('marketplace/config', views.admin_marketplace, name='admin_marketplace'),
    path('check-login/', views.check_login, name='check_login'),
    path('payment/create/<int:chart_id>/', views.create_payment, name='create_payment'),
    path('update-chart-details/<int:chart_id>/', views.update_chart, name='update-chart'),
    path('payment/execute/', views.execute_payment, name='execute_payment'),
    path('payment/cancel/', views.payment_cancel, name='payment_cancel'),
    path('payment/success/', views.payment_success, name='payment_success'),
    
    # path('manage', views.manage_orgcharts, name='manage_orgcharts'),

]

urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)

     

