"""
URL Routes
Rule-Based Mobile Money Credit Scoring System
Researcher: Nziza Aime Octave | UOK BBIT 2026
"""

from django.urls import path
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from . import views

urlpatterns = [
    # ── Authentication ─────────────────────────────────
    path('auth/register/', views.ApplicantRegisterView.as_view(), name='register'),
    path('auth/login/',   TokenObtainPairView.as_view(),   name='login'),
    path('auth/refresh/', TokenRefreshView.as_view(),      name='token_refresh'),
    path('auth/profile/', views.UserProfileView.as_view(), name='profile'),

    # ── User Management (Admin) ──────────────────────
    path('users/', views.UserListView.as_view(), name='user_list_create'),
    path('users/<int:user_id>/', views.UserDetailView.as_view(), name='user_detail'),

    # ── Institution Management ─────────────────────────
    path('institutions/', views.InstitutionListView.as_view(), name='institution_list'),

    # ── Applicant Management ───────────────────────────
    path('applicants/', views.ApplicantHistoryView.as_view(), name='applicant_list'),

    # ── Scoring Rules ──────────────────────────────────
    path('rules/', views.ScoringRulesView.as_view(), name='scoring_rules'),

    # ── Scoring ────────────────────────────────────────
    path('score/individual/', views.ScoreIndividualView.as_view(), name='score_individual'),
    path('score/batch/',      views.ScoreBatchView.as_view(),      name='score_batch'),

    # ── History & Analytics ────────────────────────────
    path('scores/history/',   views.ScoreHistoryView.as_view(),    name='score_history'),
    path('scores/analytics/',  views.DashboardStatsView.as_view(),   name='score_analytics'),
]