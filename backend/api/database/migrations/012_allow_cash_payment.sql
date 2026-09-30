-- Drop the old constraint
ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_payment_method_check;

-- Add the new constraint allowing CASH
ALTER TABLE orders ADD CONSTRAINT orders_payment_method_check 
  CHECK (payment_method IN ('VIETQR', 'WALLET', 'COFFEE_PASS', 'CASH'));
