
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
    path('auth/login/',   TokenObtainPairView.as_view(),   name='login'),
    path('auth/refresh/', TokenRefreshView.as_view(),      name='token_refresh'),
    path('auth/profile/', views.UserProfileView.as_view(), name='profile'),

    # ── Scoring ────────────────────────────────────────
    path('score/individual/', views.ScoreIndividualView.as_view(), name='score_individual'),
    path('score/batch/',      views.ScoreBatchView.as_view(),      name='score_batch'),
]
