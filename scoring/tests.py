"""
Test Suite for Rule-Based Mobile Money Credit Scoring System
Researcher: Nziza Aime Octave | UOK BBIT 2026
"""

from django.test import TestCase, Client
from django.contrib.auth import get_user_model
from rest_framework_simplejwt.tokens import RefreshToken
from scoring.models import Institution, Applicant, ScoreRecord, ScoringRule, BatchSession
from scoring.engine import CreditScoringEngine, ScoreResult
from scoring.ingestion import extract_indicators, DataIngestionError
from datetime import datetime, timedelta
import tempfile
import os
import json

User = get_user_model()


class BaseTestCase(TestCase):
    def setUp(self):
        self.institution = Institution.objects.create(
            name='Gihundwe SACCO',
            district='Rusizi',
            bnr_license_no='BNR-SACCO-001'
        )
        self.admin = User.objects.create_user(
            username='admin_test',
            password='testpass123',
            role='admin',
            first_name='Test',
            last_name='Admin',
            institution=self.institution
        )
        self.loan_officer = User.objects.create_user(
            username='officer_test',
            password='testpass123',
            role='loan_officer',
            first_name='Test',
            last_name='Officer',
            institution=self.institution
        )
        self.applicant_user = User.objects.create_user(
            username='applicant_test',
            password='testpass123',
            role='applicant',
            first_name='Test',
            last_name='Applicant'
        )
        self.client = Client()

    def get_token(self, user):
        refresh = RefreshToken.for_user(user)
        return str(refresh.access_token)

    def auth_client(self, user):
        token = self.get_token(user)
        self.client.defaults['HTTP_AUTHORIZATION'] = f'Bearer {token}'
        return self.client


class ScoringEngineTests(BaseTestCase):
    """Unit tests for the core scoring engine."""

    def setUp(self):
        super().setUp()
        # Full rule set with ranges
        rules_data = [
            ('txn_frequency', '>= 20', 20.0, 999.0, 25, 25),
            ('txn_frequency', '10-19', 10.0, 19.0, 15, 25),
            ('txn_frequency', '5-9', 5.0, 9.0, 10, 25),
            ('txn_frequency', '1-4', 1.0, 4.0, 5, 25),
            ('avg_txn_value', '>= 50k', 50000.0, 999999999.0, 20, 20),
            ('avg_txn_value', '25k-49k', 25000.0, 49999.0, 15, 20),
            ('avg_txn_value', '10k-24k', 10000.0, 24999.0, 10, 20),
            ('avg_txn_value', '1-9k', 1.0, 9999.0, 5, 20),
            ('savings_months', '6 months', 6.0, 999.0, 20, 20),
            ('savings_months', '3-5 months', 3.0, 5.0, 12, 20),
            ('savings_months', '1-2 months', 1.0, 2.0, 5, 20),
            ('bill_payment_months', '6 months', 6.0, 999.0, 15, 15),
            ('bill_payment_months', '3-5 months', 3.0, 5.0, 9, 15),
            ('bill_payment_months', '1-2 months', 1.0, 2.0, 4, 15),
            ('network_diversity', '>= 10', 10.0, 999.0, 10, 10),
            ('network_diversity', '5-9', 5.0, 9.0, 7, 10),
            ('network_diversity', '1-4', 1.0, 4.0, 5, 10),
            ('account_age_months', '>= 24', 24.0, 999.0, 10, 10),
            ('account_age_months', '12-23', 12.0, 23.0, 7, 10),
            ('account_age_months', '6-11', 6.0, 11.0, 5, 10),
            ('account_age_months', '1-5', 1.0, 5.0, 3, 10),
        ]
        for indicator, label, min_v, max_v, points, max_p in rules_data:
            ScoringRule.objects.create(
                indicator=indicator, condition_label=label,
                min_value=min_v, max_value=max_v,
                points_awarded=points, max_points=max_p, is_active=True
            )
        self.engine = CreditScoringEngine()

    def test_perfect_applicant_score(self):
        """Test maximum score for perfect applicant."""
        indicators = {
            'txn_frequency': 25.0,
            'avg_txn_value': 75000.0,
            'savings_months': 6,
            'bill_payment_months': 6,
            'network_diversity': 15,
            'account_age_months': 36
        }
        result = self.engine.compute_score(indicators)
        self.assertEqual(result.csi_total, 100)
        self.assertEqual(result.risk_tier, 'excellent')
        self.assertEqual(result.recommendation, 'approve')

    def test_minimum_applicant_score(self):
        """Test minimum score for worst applicant."""
        indicators = {
            'txn_frequency': 0.0,
            'avg_txn_value': 0.0,
            'savings_months': 0,
            'bill_payment_months': 0,
            'network_diversity': 0,
            'account_age_months': 0
        }
        result = self.engine.compute_score(indicators)
        self.assertEqual(result.csi_total, 0)
        self.assertEqual(result.risk_tier, 'very_poor')
        self.assertEqual(result.recommendation, 'decline')

    def test_boundary_low_medium(self):
        """Test exact boundary between low and medium risk."""
        indicators = {
            'txn_frequency': 15.0,
            'avg_txn_value': 30000.0,
            'savings_months': 3,
            'bill_payment_months': 3,
            'network_diversity': 7,
            'account_age_months': 18
        }
        result = self.engine.compute_score(indicators)
        self.assertEqual(result.csi_total, 65)
        self.assertEqual(result.risk_tier, 'fair')

    def test_negative_indicator_rejection(self):
        """Test that negative values raise ValueError."""
        indicators = {
            'txn_frequency': -5.0,
            'avg_txn_value': 10000.0,
            'savings_months': 2,
            'bill_payment_months': 2,
            'network_diversity': 3,
            'account_age_months': 6
        }
        with self.assertRaises(ValueError):
            self.engine.compute_score(indicators)

    def test_risk_tier_classification(self):
        """Test all risk tier boundaries."""
        test_cases = [
            (100, 'excellent', 'approve'),
            (85, 'excellent', 'approve'),
            (70, 'good', 'approve_standard'),
            (69, 'fair', 'review'),
            (55, 'fair', 'review'),
            (40, 'fair', 'review'),
            (39, 'poor', 'conditional_decline'),
            (20, 'poor', 'conditional_decline'),
            (0, 'very_poor', 'decline'),
        ]
        for csi, expected_tier, expected_rec in test_cases:
            result = ScoreResult(
                csi_total=csi,
                txn_frequency_score=0, avg_txn_value_score=0,
                savings_score=0, bill_payment_score=0,
                network_diversity_score=0, account_age_score=0,
                risk_tier=expected_tier,
                recommendation=expected_rec
            )
            self.assertEqual(result.risk_tier, expected_tier)
            self.assertEqual(result.recommendation, expected_rec)

    def test_partial_savings_score(self):
        """Test partial points for 3-5 months savings."""
        indicators = {
            'txn_frequency': 15.0,
            'avg_txn_value': 30000.0,
            'savings_months': 4,
            'bill_payment_months': 4,
            'network_diversity': 7,
            'account_age_months': 18
        }
        result = self.engine.compute_score(indicators)
        self.assertEqual(result.savings_score, 12)
        self.assertEqual(result.bill_payment_score, 9)


class DataIngestionTests(BaseTestCase):
    """Tests for data ingestion module."""

    def test_valid_csv_parsing(self):
        """Test parsing of valid CSV transaction file."""
        today = datetime.now().strftime('%Y-%m-%d')
        yesterday = (datetime.now() - timedelta(days=1)).strftime('%Y-%m-%d')
        csv_content = (
            "transaction_date,transaction_type,amount_rwf,counterparty_id,is_savings,is_bill_payment\n"
            f"{yesterday},transfer,50000,250788654321,0,0\n"
            f"{today},payment,25000,MERCHANT001,0,1"
        )
        with tempfile.NamedTemporaryFile(mode='w', suffix='.csv', delete=False) as f:
            f.write(csv_content)
            tmp_path = f.name
        try:
            indicators = extract_indicators(tmp_path, account_age_months=12)
            self.assertEqual(indicators['txn_frequency'], 2.0)
            self.assertEqual(indicators['avg_txn_value'], 37500.0)
        finally:
            os.unlink(tmp_path)

    def test_invalid_file_format(self):
        """Test rejection of malformed files."""
        with tempfile.NamedTemporaryFile(mode='w', suffix='.txt', delete=False) as f:
            f.write("this is not valid csv or json")
            tmp_path = f.name
        try:
            with self.assertRaises(DataIngestionError):
                extract_indicators(tmp_path, account_age_months=6)
        finally:
            os.unlink(tmp_path)

    def test_missing_columns(self):
        """Test handling of CSV with missing required columns."""
        csv_content = "id,date,amount\nT001,2024-01-01,50000"
        with tempfile.NamedTemporaryFile(mode='w', suffix='.csv', delete=False) as f:
            f.write(csv_content)
            tmp_path = f.name
        try:
            with self.assertRaises(DataIngestionError):
                extract_indicators(tmp_path, account_age_months=6)
        finally:
            os.unlink(tmp_path)


class APIAuthenticationTests(BaseTestCase):
    """Tests for API authentication and permissions."""

    def test_login_success(self):
        """Test successful JWT login."""
        response = self.client.post('/api/auth/login/', {
            'username': 'officer_test',
            'password': 'testpass123'
        }, content_type='application/json')
        self.assertEqual(response.status_code, 200)
        self.assertIn('access', response.json())

    def test_login_failure(self):
        """Test failed login with wrong password."""
        response = self.client.post('/api/auth/login/', {
            'username': 'officer_test',
            'password': 'wrongpassword'
        }, content_type='application/json')
        self.assertEqual(response.status_code, 401)

    def test_profile_access_authenticated(self):
        """Test profile access with valid token."""
        client = self.auth_client(self.loan_officer)
        response = client.get('/api/auth/profile/')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()['username'], 'officer_test')

    def test_profile_access_unauthenticated(self):
        """Test profile access without token."""
        response = self.client.get('/api/auth/profile/')
        self.assertEqual(response.status_code, 401)

    def test_self_registration(self):
        """Test applicant self-registration."""
        response = self.client.post('/api/auth/register/', {
            'username': 'new_applicant',
            'password': 'SecurePass123!',
            'password_confirm': 'SecurePass123!',
            'first_name': 'New',
            'last_name': 'Applicant',
            'email': 'new@example.com',
            'phone_number': '250788999999',
            'national_id': '1199780012345678'
        }, content_type='application/json')
        self.assertEqual(response.status_code, 201)
        data = response.json()
        self.assertEqual(data['role'], 'applicant')
        user = User.objects.get(username='new_applicant')
        self.assertEqual(user.role, 'applicant')

    def test_self_registration_role_override_blocked(self):
        """Test that self-registration cannot set admin role."""
        response = self.client.post('/api/auth/register/', {
            'username': 'hacker',
            'password': 'SecurePass123!',
            'password_confirm': 'SecurePass123!',
            'first_name': 'Hacker',
            'last_name': 'User',
            'email': 'hacker@example.com', 
            'phone_number': '250788999999',  
            'national_id': '1199780087654321',
            'role': 'admin'
        }, content_type='application/json')
        
        self.assertEqual(response.status_code, 201)
        user = User.objects.get(username='hacker')
        self.assertEqual(user.role, 'applicant')

    def test_admin_can_create_user(self):
        """Test admin creating user with any role."""
        client = self.auth_client(self.admin)
        response = client.post('/api/users/', {
            'username': 'new_officer',
            'password': 'SecurePass123!',
            'first_name': 'New',
            'last_name': 'Officer',
            'role': 'loan_officer',
            'institution': self.institution.id
        }, content_type='application/json')
        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.json()['role'], 'loan_officer')

    def test_non_admin_cannot_create_user(self):
        """Test that loan officers cannot create users."""
        client = self.auth_client(self.loan_officer)
        response = client.post('/api/users/', {
            'username': 'unauthorized',
            'password': 'SecurePass123!',
            'first_name': 'Unauthorized',
            'last_name': ''
        }, content_type='application/json')
        self.assertEqual(response.status_code, 403)

    def test_admin_can_list_users(self):
        """Test admin listing all users."""
        client = self.auth_client(self.admin)
        response = client.get('/api/users/')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.json()), 3)

    def test_non_admin_cannot_list_users(self):
        """Test that loan officers cannot list all users."""
        client = self.auth_client(self.loan_officer)
        response = client.get('/api/users/')
        self.assertEqual(response.status_code, 403)


class ScoringAPITests(BaseTestCase):
    """Tests for scoring API endpoints."""

    def setUp(self):
        super().setUp()
        rules_data = [
            ('txn_frequency', '>= 20', 20.0, 999.0, 25, 25),
            ('avg_txn_value', '>= 50k', 50000.0, 999999999.0, 20, 20),
            ('savings_months', '6 months', 6.0, 999.0, 20, 20),
            ('savings_months', '3-5 months', 3.0, 5.0, 12, 20),
            ('bill_payment_months', '6 months', 6.0, 999.0, 15, 15),
            ('bill_payment_months', '3-5 months', 3.0, 5.0, 9, 15),
            ('network_diversity', '>= 10', 10.0, 999.0, 10, 10),
            ('network_diversity', '5-9', 5.0, 9.0, 7, 10),
            ('account_age_months', '>= 24', 24.0, 999.0, 10, 10),
            ('account_age_months', '12-23', 12.0, 23.0, 7, 10),
        ]
        for indicator, label, min_v, max_v, points, max_p in rules_data:
            ScoringRule.objects.create(
                indicator=indicator, condition_label=label,
                min_value=min_v, max_value=max_v,
                points_awarded=points, max_points=max_p, is_active=True
            )

    def _make_csv(self, with_applicant_ref=False):
        """Helper to generate test CSV content."""
        today = datetime.now().strftime('%Y-%m-%d')
        yesterday = (datetime.now() - timedelta(days=1)).strftime('%Y-%m-%d')
        cols = "transaction_date,transaction_type,amount_rwf,counterparty_id,is_savings,is_bill_payment"
        if with_applicant_ref:
            cols += ",applicant_ref"
            rows = (
                f"\n{yesterday},transfer,50000,250788654321,0,0,APP-001"
                f"\n{today},payment,75000,MERCHANT001,0,1,APP-001"
                f"\n{yesterday},transfer,30000,250788111111,0,0,APP-002"
                f"\n{today},payment,20000,MERCHANT002,1,0,APP-002"
            )
        else:
            rows = (
                f"\n{yesterday},transfer,50000,250788654321,0,0"
                f"\n{today},payment,25000,MERCHANT001,0,1"
            )
        return cols + rows

    def test_individual_scoring_success(self):
        """Test successful individual scoring."""
        client = self.auth_client(self.loan_officer)
        csv_content = self._make_csv()
        with tempfile.NamedTemporaryFile(mode='w', suffix='.csv', delete=False) as f:
            f.write(csv_content)
            tmp_path = f.name
        try:
            with open(tmp_path, 'rb') as f:
                response = client.post('/api/score/individual/', {
                    'transaction_file': f,
                    'applicant_ref': 'APP-001',
                    'applicant_name': 'Test Applicant',
                    'phone_number': '250788123456',
                    'account_age_months': 24,
                    'gender': 'M',
                    'district': 'Rusizi'
                })
            self.assertEqual(response.status_code, 201)
            data = response.json()
            self.assertIn('csi_total', data)
            self.assertIn('risk_tier', data)
            self.assertIn('recommendation', data)
        finally:
            os.unlink(tmp_path)

    def test_individual_scoring_permission_denied(self):
        """Test that applicants cannot score."""
        client = self.auth_client(self.applicant_user)
        response = client.post('/api/score/individual/', {})
        self.assertEqual(response.status_code, 403)

    def test_individual_scoring_missing_fields(self):
        """Test validation of required fields."""
        client = self.auth_client(self.loan_officer)
        response = client.post('/api/score/individual/', {
            'applicant_ref': '',
            'applicant_name': ''
        })
        self.assertEqual(response.status_code, 400)
        self.assertIn('error', response.json())

    def test_individual_scoring_invalid_file(self):
        """Test rejection of invalid file types."""
        client = self.auth_client(self.loan_officer)
        with tempfile.NamedTemporaryFile(mode='w', suffix='.exe', delete=False) as f:
            f.write("malicious content")
            tmp_path = f.name
        try:
            with open(tmp_path, 'rb') as f:
                response = client.post('/api/score/individual/', {
                    'transaction_file': f,
                    'applicant_ref': 'APP-001',
                    'applicant_name': 'Test'
                })
            self.assertEqual(response.status_code, 400)
            self.assertIn('error', response.json())
        finally:
            os.unlink(tmp_path)

    def test_batch_scoring_success(self):
        """Test successful batch scoring."""
        client = self.auth_client(self.loan_officer)
        csv_content = self._make_csv(with_applicant_ref=True)
        with tempfile.NamedTemporaryFile(mode='w', suffix='.csv', delete=False) as f:
            f.write(csv_content)
            tmp_path = f.name
        try:
            with open(tmp_path, 'rb') as f:
                response = client.post('/api/score/batch/', {
                    'transaction_file': f,
                    'account_ages': json.dumps({'APP-001': 24, 'APP-002': 12}),
                    'notes': 'Test batch'
                })
            self.assertEqual(response.status_code, 201)
            data = response.json()
            self.assertIn('session_ref', data['batch_session'])
            self.assertIn('results', data)
        finally:
            os.unlink(tmp_path)


class FairnessTests(BaseTestCase):
    """Tests for algorithmic fairness."""

    def setUp(self):
        super().setUp()
        for indicator, points in [
            ('txn_frequency', 25), ('avg_txn_value', 20),
            ('savings_months', 20), ('bill_payment_months', 15),
            ('network_diversity', 10), ('account_age_months', 10)
        ]:
            ScoringRule.objects.create(
                indicator=indicator, condition_label='test',
                min_value=0.0, max_value=999.0, points_awarded=points,
                max_points=points, is_active=True
            )

    def test_gender_neutrality(self):
        """Test that identical indicators produce same score regardless of gender."""
        engine = CreditScoringEngine()
        indicators = {
            'txn_frequency': 15.0, 'avg_txn_value': 30000.0,
            'savings_months': 4, 'bill_payment_months': 4,
            'network_diversity': 7, 'account_age_months': 18
        }
        result_male = engine.compute_score(indicators)
        result_female = engine.compute_score(indicators)
        self.assertEqual(result_male.csi_total, result_female.csi_total)
        self.assertEqual(result_male.risk_tier, result_female.risk_tier)


class ModelTests(BaseTestCase):
    """Tests for database models."""

    def test_applicant_creation(self):
        """Test applicant model creation."""
        applicant = Applicant.objects.create(
            applicant_ref='APP-TEST-001',
            full_name='Test Applicant',
            phone_number='250788123456',
            gender='M',
            district='Rusizi',
            institution=self.institution,
            created_by=self.admin
        )
        self.assertEqual(str(applicant), 'Test Applicant (APP-TEST-001)')
        self.assertEqual(applicant.gender, 'M')

    def test_score_record_creation(self):
        """Test score record creation with all sub-scores."""
        applicant = Applicant.objects.create(
            applicant_ref='APP-TEST-002',
            full_name='Test Applicant 2',
            institution=self.institution,
            created_by=self.admin
        )
        score = ScoreRecord.objects.create(
            applicant=applicant,
            scored_by=self.loan_officer,
            txn_frequency_score=25,
            avg_txn_value_score=20,
            savings_score=20,
            bill_payment_score=15,
            network_diversity_score=10,
            account_age_score=10,
            csi_total=100,
            risk_tier='excellent',
            recommendation='approve',
            scoring_mode='individual'
        )
        self.assertEqual(score.csi_total, 100)
        self.assertEqual(score.risk_tier, 'excellent')
        self.assertEqual(score.recommendation, 'approve')

    def test_batch_session_creation(self):
        """Test batch session tracking."""
        batch = BatchSession.objects.create(
            session_ref='BATCH-TEST-001',
            institution=self.institution,
            created_by=self.loan_officer,
            total_applicants=10,
            processed_count=10,
            status='completed'
        )
        self.assertEqual(batch.status, 'completed')
        self.assertIn('BATCH-TEST-001', str(batch))