from django.http import JsonResponse
from django.urls import path
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from . import views

def api_root(request):
    return JsonResponse({
        "message": "MMCSS Backend API",
        "version": "1.0",
        "researcher": "Nziza Aime Octave",
        "institution": "UOK BBIT 2026",
        "endpoints": {
            "authentication": "/api/auth/",
            "scoring": "/api/score/",
            "rules": "/api/rules/",
            "applicants": "/api/applicants/",
            "analytics": "/api/scores/",
            "documentation": "https://github.com/your-repo/mmcss-backend"
        },
        "documentation": {
            "register": "/api/auth/register/",
            "login": "/api/auth/login/",
            "score_individual": "/api/score/individual/",
            "score_batch": "/api/score/batch/"
        }
    })

urlpatterns = [
    # ── Root API Info ──────────────────────────────────
    path('', api_root, name='api_root'),

    # ── Authentication ─────────────────────────────────
    path('auth/register/', views.ApplicantRegisterView.as_view(), name='register'),
    path('auth/login/', TokenObtainPairView.as_view(), name='login'),
    path('auth/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('auth/profile/', views.UserProfileView.as_view(), name='profile'),
    path('auth/otp/request/', views.RequestOTPView.as_view(), name='request_otp'),
    path('auth/otp/verify/', views.VerifyOTPView.as_view(), name='verify_otp'),
    path('auth/otp/resend/', views.ResendOTPView.as_view(), name='resend_otp'),
        # ── Phone OTP (Console/Print for testing) ──────────
    path('auth/phone/request/', views.RequestPhoneOTPView.as_view(), name='request_phone_otp'),
    path('auth/phone/verify/', views.VerifyPhoneOTPView.as_view(), name='verify_phone_otp'),

    # ── User Management (Admin) ──────────────────────
    path('users/', views.UserListView.as_view(), name='user_list_create'),
    path('users/<int:user_id>/', views.UserDetailView.as_view(), name='user_detail'),

    # ── Institution Management ─────────────────────────
    path('institutions/', views.InstitutionListView.as_view(), name='institution_list'),

    # ── Applicant Management ───────────────────────────
    path('applicants/', views.ApplicantListView.as_view(), name='applicant_list'),
    path('applicants/<str:applicant_ref>/', views.ApplicantHistoryView.as_view(), name='applicant_history'),

    # ── Scoring Rules ──────────────────────────────────
    path('rules/', views.ScoringRulesView.as_view(), name='scoring_rules'),
    path('rules/<int:rule_id>/', views.ScoringRulesView.as_view(), name='scoring_rule_update'),

    # ── Scoring ────────────────────────────────────────
    path('score/individual/', views.ScoreIndividualView.as_view(), name='score_individual'),
    path('score/batch/', views.ScoreBatchView.as_view(), name='score_batch'),

    # ── History & Analytics ────────────────────────────
    path('scores/history/', views.ScoreHistoryView.as_view(), name='score_history'),
    path('scores/analytics/', views.ScoreAnalyticsView.as_view(), name='score_analytics'),
    path('scores/<int:score_id>/', views.ScoreDetailView.as_view(), name='score_detail'),

    # ── Batch Sessions ─────────────────────────────────
    path('batches/', views.BatchSessionListView.as_view(), name='batch_list'),

    # ── Applicant Portal ───────────────────────────────
    path('applicant/portal/', views.ApplicantPortalView.as_view(), name='applicant_portal'),
    path('applicant/upload/', views.ApplicantUploadView.as_view(), name='applicant_upload'),
    path('applicant/profile/', views.ApplicantProfileUpdateView.as_view(), name='applicant_profile'),
    path('applicant/scores/', views.ApplicantOwnScoresView.as_view(), name='applicant_scores'),
]