"""
Serializers
Rule-Based Mobile Money Credit Scoring System
Researcher: Nziza Aime Octave | UOK BBIT 2026
"""

from rest_framework import serializers
from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from .models import Applicant, ScoreRecord, BatchSession, Institution, ScoringRule

User = get_user_model()


class InstitutionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Institution
        fields = ['id', 'name', 'district', 'bnr_license_no', 'contact_email']


class UserSerializer(serializers.ModelSerializer):
    institution_name = serializers.CharField(source='institution.name', read_only=True)
    full_name = serializers.SerializerMethodField()
    
    class Meta:
        model = User
        fields = [
            'id', 'username', 'email', 'first_name', 'last_name', 'full_name', 'role',
            'phone_number', 'institution', 'institution_name',
            'is_active', 'date_joined', 'last_login'
        ]
        read_only_fields = ['id', 'date_joined', 'last_login']
    
    def get_full_name(self, obj):
        return f"{obj.first_name} {obj.last_name}".strip()


class UserRegistrationSerializer(serializers.ModelSerializer):
    password = serializers.CharField(
        write_only=True, required=True, validators=[validate_password]
    )
    password_confirm = serializers.CharField(write_only=True, required=True)
    
    class Meta:
        model = User
        fields = [
            'username', 'password', 'password_confirm', 'email',
            'first_name', 'last_name', 'role', 'phone_number', 'institution'
        ]
    
    def validate(self, attrs):
        if attrs['password'] != attrs['password_confirm']:
            raise serializers.ValidationError({"password": "Password fields didn't match."})
        if 'role' in attrs and attrs['role'] != 'applicant':
            attrs['role'] = 'applicant'
        return attrs
    
    def create(self, validated_data):
        validated_data.pop('password_confirm')
        user = User.objects.create_user(**validated_data)
        return user


class UserUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['first_name', 'last_name', 'email', 'phone_number', 'institution']


class ApplicantSerializer(serializers.ModelSerializer):
    institution_name = serializers.CharField(source='institution.name', read_only=True)
    created_by_name = serializers.SerializerMethodField()
    
    class Meta:
        model = Applicant
        fields = [
            'id', 'applicant_ref', 'full_name', 'phone_number',
            'gender', 'district', 'mobile_operator', 'institution',
            'institution_name', 'created_by', 'created_by_name', 'created_at'
        ]
    
    def get_created_by_name(self, obj):
        if obj.created_by:
            return f"{obj.created_by.first_name} {obj.created_by.last_name}".strip()
        return ''


class ScoreRecordSerializer(serializers.ModelSerializer):
    applicant_name = serializers.CharField(source='applicant.full_name', read_only=True)
    applicant_ref = serializers.CharField(source='applicant.applicant_ref', read_only=True)
    scored_by_name = serializers.SerializerMethodField()
    
    class Meta:
        model = ScoreRecord
        fields = [
            'id', 'applicant', 'applicant_name', 'applicant_ref',
            'scored_by', 'scored_by_name', 'scored_at',
            'txn_frequency_score', 'avg_txn_value_score', 'savings_score',
            'bill_payment_score', 'network_diversity_score', 'account_age_score',
            'csi_total', 'risk_tier', 'recommendation', 'scoring_mode', 'notes'
        ]
    
    def get_scored_by_name(self, obj):
        if obj.scored_by:
            return f"{obj.scored_by.first_name} {obj.scored_by.last_name}".strip()
        return ''


class BatchSessionSerializer(serializers.ModelSerializer):
    institution_name = serializers.CharField(source='institution.name', read_only=True)
    created_by_name = serializers.SerializerMethodField()
    
    class Meta:
        model = BatchSession
        fields = [
            'id', 'session_ref', 'institution', 'institution_name',
            'created_by', 'created_by_name', 'total_applicants',
            'processed_count', 'status', 'notes', 'created_at'
        ]
    
    def get_created_by_name(self, obj):
        if obj.created_by:
            return f"{obj.created_by.first_name} {obj.created_by.last_name}".strip()
        return ''


class ScoringRuleSerializer(serializers.ModelSerializer):
    class Meta:
        model = ScoringRule
        fields = [
            'id', 'indicator', 'condition_label',
            'min_value', 'max_value', 'points_awarded', 'max_points',
            'is_active', 'updated_at'
        ]