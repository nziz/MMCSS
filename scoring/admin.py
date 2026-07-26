from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from .models import User, Applicant, Institution, BatchSession, ScoringRule

@admin.register(User)
class UserAdmin(BaseUserAdmin):
    list_display = ['id', 'username', 'email', 'first_name', 'last_name', 'role', 'is_staff', 'is_active', 'created_at']
    list_filter = ['is_staff', 'is_active', 'role']
    search_fields = ['username', 'email', 'first_name', 'last_name', 'phone_number']
    fieldsets = BaseUserAdmin.fieldsets + (
        ('Custom Fields', {'fields': ('role', 'phone_number', 'institution', 'is_first_login')}),
    )

@admin.register(Applicant)
class ApplicantAdmin(admin.ModelAdmin):
    list_display = ['id', 'applicant_ref', 'full_name', 'phone_number', 'gender', 'district', 'mobile_operator', 'national_id', 'created_at']
    list_filter = ['gender', 'district', 'mobile_operator', 'created_at']
    search_fields = ['applicant_ref', 'full_name', 'phone_number', 'national_id']

# COMMENTED OUT - Institution bypass
# @admin.register(Institution)
# class InstitutionAdmin(admin.ModelAdmin):
#     pass

@admin.register(BatchSession)
class BatchSessionAdmin(admin.ModelAdmin):
    list_display = ['id', 'session_ref', 'institution', 'created_by', 'total_applicants', 'processed_count', 'failed_count', 'status', 'created_at']
    list_filter = ['status', 'created_at']
    search_fields = ['session_ref', 'notes']

@admin.register(ScoringRule)
class ScoringRuleAdmin(admin.ModelAdmin):
    list_display = ['indicator', 'condition_label', 'min_value', 'max_value', 'points_awarded', 'max_points', 'is_active', 'updated_at']
    list_filter = ['indicator', 'is_active']
    search_fields = ['indicator', 'condition_label']