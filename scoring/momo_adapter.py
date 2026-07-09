import csv
import io
import re
import json

def convert_momo_to_internal_json(file_path):
    """
    Reads an MTN MoMo statement, detects transactions, and normalizes them
    into a structured JSON stream format that the existing engine expects.
    """
    with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
        content = f.read()

    # Strategy Selector: If it's not a MoMo statement, return None to trigger fallback
    if "Momo Statement" not in content and "Transaction Id" not in content:
        return None

    csv_file = io.StringIO(content)
    reader = csv.reader(csv_file)
    normalized_txs = []
    
    valid_statuses = {'SUCCESSFUL', 'FAILED', 'PENDING'}
    
    for row in reader:
        if not row or len(row) < 6:
            continue
            
        clean_row = [field.strip() for field in row]
        tx_id = clean_row[0]
        
        # Verify row starts with a numeric transaction reference ID
        if not re.match(r'^\d+$', tx_id):
            continue
            
        status = clean_row[1].upper()
        if status not in valid_statuses:
            continue

        try:
            # Map structural components out of the MoMo CSV layout safely
            amount_str = clean_row[6].replace(',', '') if len(clean_row) > 6 else '0'
            fee_str = clean_row[7].replace(',', '') if len(clean_row) > 7 else '0'
            balance_str = clean_row[8].replace(',', '') if len(clean_row) > 8 else '0'
            
            normalized_txs.append({
                "txn_id": tx_id,
                "status": status,
                "type": clean_row[2],
                "timestamp": clean_row[3],
                "sender": clean_row[4],
                "recipient": clean_row[5],
                "amount": float(amount_str),
                "fee": 0.0 if 'N/A' in fee_str.upper() or not fee_str else float(fee_str),
                "balance_after": float(balance_str)
            })
        except (ValueError, IndexError):
            continue

    # Return a temporary string buffer holding our unified transaction format
    return json.dumps({"transactions": normalized_txs}, indent=2)

