import csv
import io
import re
from datetime import datetime
from decimal import Decimal

def parse_momo_statement(file_wrapper):
    """
    Parses structural MoMo statement formats into standard dictionaries.
    Bypasses headers and non-transaction summary text.
    """
    content = file_wrapper.read()
    if isinstance(content, bytes):
        content = content.decode('utf-8')
        
    csv_file = io.StringIO(content)
    reader = csv.reader(csv_file)
    parsed_transactions = []
    
    valid_statuses = {'SUCCESSFUL', 'FAILED', 'PENDING'}
    
    for row in reader:
        # Filter out empty or broken rows
        if not row or len(row) < 6:
            continue
            
        clean_row = [field.strip() for field in row]
        tx_id = clean_row[0]
        
        # Check if first item is a valid numerical Transaction ID (e.g., 29049422130)
        if not re.match(r'^\d+$', tx_id):
            continue
            
        status = clean_row[1].upper()
        if status not in valid_statuses:
            continue

        try:
            # Map index array explicitly based on MoMo PDF structure
            tx_type = clean_row[2]
            date_str = clean_row[3]
            sender = clean_row[4]
            recipient = clean_row[5]
            amount = Decimal(clean_row[6].replace(',', ''))
            
            # Safely handle 'N/A' strings for fees
            raw_fee = clean_row[7] if len(clean_row) > 7 else '0'
            fee_val = Decimal('0') if 'N/A' in raw_fee.upper() or not raw_fee else Decimal(raw_fee.replace(',', ''))
            
            balance = Decimal(clean_row[8].replace(',', '')) if len(clean_row) > 8 else Decimal('0')
            
            parsed_transactions.append({
                "transaction_id": tx_id,
                "status": status,
                "transaction_type": tx_type,
                "date": datetime.strptime(date_str, "%Y-%m-%d %H:%M:%S"),
                "sender": sender,
                "recipient": recipient,
                "amount": amount,
                "fee": fee_val,
                "balance_after": balance
            })
        except (ValueError, IndexError):
            continue
            
    return parsed_transactions

