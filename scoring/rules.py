from decimal import Decimal

def calculate_momo_metrics(transactions):
    """
    Calculates operational health and risk insights from an array of parsed transactions.
    """
    if not transactions:
        return {}

    total_count = len(transactions)
    total_volume = Decimal('0')
    loan_payout_count = 0
    airtime_spend = Decimal('0')
    
    # Track ending balance metric directly from historical chronological balance sheets
    latest_balance = transactions[0]['balance_after'] 
    
    for tx in transactions:
        total_volume += tx['amount']
        
        # Flag 1: Track internal loan payouts (e.g., MoFlex Loans)
        if 'LOAN' in tx['transaction_type'].upper() or 'MOFLEX' in tx['sender'].upper():
            loan_payout_count += 1
            
        # Flag 2: Keep track of micro-spending trends like Airtime
        if 'AIRTIME' in tx['recipient'].lower() or 'EXTERNAL_PAYMENT' in tx['transaction_type'].upper():
            if 'airtime' in tx['recipient'].lower():
                airtime_spend += tx['amount']

    # Assign credit risk rating variables based on historical activity metrics
    if latest_balance > 50000:
        tier = 'excellent'
    elif latest_balance > 15000:
        tier = 'good'
    elif loan_payout_count > 3:
        tier = 'poor'
    else:
        tier = 'fair'

    return {
        "total_scorings": total_count,
        "average_csi": int(min(100, max(10, (latest_balance / 2000) + 30))), # Normalizes an index score out of 100
        "latest_csi": int(min(100, max(15, (latest_balance / 2500) + 25))),
        "latest_tier": tier,
        "statistics": {
            "total_transactions": total_count,
            "loan_velocity_count": loan_payout_count,
            "airtime_expenditure": float(airtime_spend),
            "final_reported_balance": float(latest_balance)
        }
    }

