"""
API Views
Rule-Based Mobile Money Credit Scoring System
Researcher: Nziza Aime Octave | UOK BBIT 2026
"""

import os
import io
import re
import json
import uuid
import tempfile
from django.utils import timezone
from django.db.models import Avg, Count
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.parsers import MultiPartParser, FormParser

from .models import (
    Applicant, ScoreRecord, BatchSession,
    Institution, ScoringRule, User
)
from .engine import CreditScoringEngine
from .ingestion import extract_indicators, extract_indicators_batch, DataIngestionError
from .serializers import (
    ScoreRecordSerializer, ApplicantSerializer,
    BatchSessionSerializer, InstitutionSerializer,
    ScoringRuleSerializer, UserSerializer
)


# ─── MOMO STRATEGY ADAPTER FUNCTIONS ─────────────────────────────────────────
def convert_momo_file_to_clean_json(file_path):
    """
    Checks if a temporary file is an MTN MoMo statement. If it is, 
    it normalizes the structure into a clean JSON layout string.
    Returns None if the file is a standard legacy file format.
    """
    try:
        with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
            content = f.read()

        # If it doesn't look like an MTN MoMo statement, skip entirely
        if "Momo Statement" not in content and "Transaction Id" not in content:
            return None

        import csv
        csv_file = io.StringIO(content)
        reader = csv.reader(csv_file)
        normalized_txs = []
        valid_statuses = {'SUCCESSFUL', 'FAILED', 'PENDING'}
        
        for row in reader:
            if not row or len(row) < 6:
                continue
                
            clean_row = [field.strip() for field in row]
            tx_id = clean_row
            
            # Row validation: must start with numerical transaction ID
            if not re.match(r'^\d+$', tx_id):
                continue
                
            status_val = clean_row.upper()
            if status_val not in valid_statuses:
                continue

            try:
                # Safe column extraction and index cleansing
                amount_str = clean_row.replace(',', '') if len(clean_row) > 6 else '0'
                fee_str = clean_row.replace(',', '') if len(clean_row) > 7 else '0'
                balance_str = clean_row.replace(',', '') if len(clean_row) > 8 else '0'
                
                normalized_txs.append({
                    "txn_id": tx_id,
                    "status": status_val,
                    "type": clean_row,
                    "timestamp": clean_row,
                    "sender": clean_row,
                    "recipient": clean_row,
                    "amount": float(amount_str),
                    "fee": 0.0 if 'N/A' in fee_str.upper() or not fee_str else float(fee_str),
                    "balance_after": float(balance_str)
                })
            except (ValueError, IndexError):
                continue

        return json.dumps({"transactions": normalized_txs}, indent=2)
    except Exception:
        return None
# ─── PERMISSION HELPERS ───────────────────────────────────────────────────────
def is_admin(user):
    return user.role == 'admin'

def is_loan_officer(user):
    return user.role in ['admin', 'loan_officer']

def is_branch_manager(user):
    return user.role in ['admin', 'branch_manager']

def can_view(user):
    return user.role in ['admin', 'loan_officer', 'auditor', 'branch_manager']


# ─── AUTH: USER PROFILE ───────────────────────────────────────────────────────
class UserProfileView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        serializer = UserSerializer(request.user)
        return Response(serializer.data)


# ─── INDIVIDUAL SCORING ───────────────────────────────────────────────────────
class ScoreIndividualView(APIView):
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]

    def post(self, request):
        if not is_loan_officer(request.user):
            return Response(
                {'error': 'Permission denied. Loan Officer role required.'},
                status=status.HTTP_403_FORBIDDEN
            )

        # Get form data
        transaction_file = request.FILES.get('transaction_file')
        applicant_ref    = request.data.get('applicant_ref', '').strip()
        applicant_name   = request.data.get('applicant_name', '').strip()
        phone_number     = request.data.get('phone_number', '').strip()
        account_age      = int(request.data.get('account_age_months', 0))
        gender           = request.data.get('gender', '')
        district         = request.data.get('district', '')
        mobile_operator  = request.data.get('mobile_operator', 'mtn')
        notes            = request.data.get('notes', '')

        # Validate required fields
        if not transaction_file:
            return Response({'error': 'Transaction file is required.'}, status=status.HTTP_400_BAD_REQUEST)
        if not applicant_ref:
            return Response({'error': 'Applicant reference code is required.'}, status=status.HTTP_400_BAD_REQUEST)
        if not applicant_name:
            return Response({'error': 'Applicant name is required.'}, status=status.HTTP_400_BAD_REQUEST)

        # Save file temporarily
        suffix = '.json' if transaction_file.name.endswith('.json') else '.csv'
        with tempfile.NamedTemporaryFile(suffix=suffix, delete=False) as tmp:
            for chunk in transaction_file.chunks():
                tmp.write(chunk)
            tmp_path = tmp.name

        try:
            # DYNAMIC PIPELINE ADAPTER: Intercept and translate MoMo file structures automatically
            momo_json_data = convert_momo_file_to_clean_json(tmp_path)
            if momo_json_data is not None:
                os.unlink(tmp_path)  # Drop old CSV reference point securely
                with tempfile.NamedTemporaryFile(suffix='.json', mode='w', delete=False) as json_tmp:
                    json_tmp.write(momo_json_data)
                    tmp_path = json_tmp.name

            # Extract indicators using original backend behavior rules
            indicators = extract_indicators(tmp_path, account_age)

            # Run scoring engine
            engine = CreditScoringEngine()
            result = engine.compute_score(indicators)

            # Get or create applicant
            applicant, created = Applicant.objects.get_or_create(
                applicant_ref=applicant_ref,
                defaults={
                    'full_name':       applicant_name,
                    'phone_number':    phone_number,
                    'gender':          gender,
                    'district':        district,
                    'mobile_operator': mobile_operator,
                    'institution':     request.user.institution,
                    'created_by':      request.user,
                }
            )

            # Save score record
            score = ScoreRecord.objects.create(
                applicant=applicant,
                scored_by=request.user,
                txn_frequency_score=result.txn_frequency_score,
                avg_txn_value_score=result.avg_txn_value_score,
                savings_score=result.savings_score,
                bill_payment_score=result.bill_payment_score,
                network_diversity_score=result.network_diversity_score,
                account_age_score=result.account_age_score,
                csi_total=result.csi_total,
                risk_tier=result.risk_tier,
                recommendation=result.recommendation,
                scoring_mode='individual',
                notes=notes,
            )

            serializer = ScoreRecordSerializer(score)
            return Response(serializer.data, status=status.HTTP_201_CREATED)

        except DataIngestionError as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            return Response({'error': f'Scoring failed: {str(e)}'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        finally:
            if os.path.exists(tmp_path):
                os.unlink(tmp_path)
# ─── BATCH SCORING ────────────────────────────────────────────────────────────
class ScoreBatchView(APIView):
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]

    def post(self, request):
        if not is_loan_officer(request.user):
            return Response(
                {'error': 'Permission denied. Loan Officer role required.'},
                status=status.HTTP_403_FORBIDDEN
            )

        transaction_file = request.FILES.get('transaction_file')
        account_ages_raw = request.data.get('account_ages', '{}')
        notes            = request.data.get('notes', '')

        if not transaction_file:
            return Response({'error': 'Transaction file is required.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            account_ages = json.loads(account_ages_raw)
        except Exception:
            account_ages = {}

        suffix = '.json' if transaction_file.name.endswith('.json') else '.csv'
        with tempfile.NamedTemporaryFile(suffix=suffix, delete=False) as tmp:
            for chunk in transaction_file.chunks():
                tmp.write(chunk)
            tmp_path = tmp.name

        # Create batch session
        session_ref = f"BATCH-{uuid.uuid4().hex[:8].upper()}"
        batch = BatchSession.objects.create(
            session_ref=session_ref,
            institution=request.user.institution,
            created_by=request.user,
            notes=notes,
        )

        try:
            all_indicators = extract_indicators_batch(tmp_path, account_ages)
            batch.total_applicants = len(all_indicators)
            batch.save()

            engine = CreditScoringEngine()
            results = []
            failed = 0

            for ref, indicators in all_indicators.items():
                try:
                    result = engine.compute_score(indicators)
                    applicant, _ = Applicant.objects.get_or_create(
                        applicant_ref=ref,
                        defaults={
                            'full_name':    f'Applicant {ref}',
                            'phone_number': '',
                            'institution':  request.user.institution,
                            'created_by':   request.user,
                        }
                    )
                    score = ScoreRecord.objects.create(
                        applicant=applicant,
                        scored_by=request.user,
                        batch=batch,
                        txn_frequency_score=result.txn_frequency_score,
                        avg_txn_value_score=result.avg_txn_value_score,
                        savings_score=result.savings_score,
                        bill_payment_score=result.bill_payment_score,
                        network_diversity_score=result.network_diversity_score,
                        account_age_score=result.account_age_score,
                        csi_total=result.csi_total,
                        risk_tier=result.risk_tier,
                        recommendation=result.recommendation,
                        scoring_mode='batch',
                    )
                    results.append(ScoreRecordSerializer(score).data)
                except Exception:
                    failed += 1

            batch.processed_applicants = len(results)
            batch.status = 'completed' if failed == 0 else 'partial'
            batch.save()

            return Response({
                'session_ref': session_ref,
                'total': batch.total_applicants,
                'processed': batch.processed_applicants,
                'failed': failed,
                'results': results
            }, status=status.HTTP_201_CREATED)

        except DataIngestionError as e:
            batch.status = 'failed'
            batch.save()
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            batch.status = 'failed'
            batch.save()
            return Response({'error': f'Batch scoring failed: {str(e)}'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        finally:
            if os.path.exists(tmp_path):
                os.unlink(tmp_path)
