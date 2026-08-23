# RLS_POLICIES.md — Row-Level Security & JWT Claims

> Phụ thuộc: `ERD.md` (tên bảng/cột). Dùng bởi: mọi service backend khi query trực tiếp qua Supabase client (không dùng service_role key cho các route người dùng cuối).

## 1. Cấu trúc JWT Custom Claims

Khi user đăng nhập qua Supabase Auth, một Postgres Function hook (`custom_access_token_hook`) chèn thêm claims sau vào JWT trước khi trả về client:

```json
{
  "sub": "auth-user-uuid",
  "role_app": "OWNER | STAFF | SUPPORT | CUSTOMER",
  "tenant_id": "uuid",
  "branch_id": "uuid | null"
}
```

> Đặt tên `role_app` (không phải `role`) để tránh đụng claim `role` mặc định của Supabase (dùng cho Postgres role `authenticated`/`anon`).

```sql
CREATE OR REPLACE FUNCTION public.custom_access_token_hook(event jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  claims jsonb;
  v_role VARCHAR(20);
  v_tenant_id UUID;
  v_branch_id UUID;
BEGIN
  SELECT role, tenant_id, branch_id INTO v_role, v_tenant_id, v_branch_id
  FROM public.users WHERE auth_user_id = (event->>'user_id')::uuid AND is_active = TRUE;

  IF v_role IS NULL THEN
    SELECT 'CUSTOMER', tenant_id, NULL INTO v_role, v_tenant_id, v_branch_id
    FROM public.customers WHERE auth_user_id = (event->>'user_id')::uuid;
  END IF;

  claims := event->'claims';
  claims := jsonb_set(claims, '{role_app}', COALESCE(to_jsonb(v_role), 'null'::jsonb));
  claims := jsonb_set(claims, '{tenant_id}', COALESCE(to_jsonb(v_tenant_id), 'null'::jsonb));
  claims := jsonb_set(claims, '{branch_id}', COALESCE(to_jsonb(v_branch_id), 'null'::jsonb));

  event := jsonb_set(event, '{claims}', claims);
  RETURN event;
END;
$$;
```

## 2. Helper functions dùng trong policy

```sql
CREATE OR REPLACE FUNCTION auth.tenant_id() RETURNS UUID AS $$
  SELECT NULLIF(current_setting('request.jwt.claims', true)::jsonb->>'tenant_id', '')::uuid;
$$ LANGUAGE sql STABLE;

CREATE OR REPLACE FUNCTION auth.role_app() RETURNS TEXT AS $$
  SELECT current_setting('request.jwt.claims', true)::jsonb->>'role_app';
$$ LANGUAGE sql STABLE;

CREATE OR REPLACE FUNCTION auth.branch_id() RETURNS UUID AS $$
  SELECT NULLIF(current_setting('request.jwt.claims', true)::jsonb->>'branch_id', '')::uuid;
$$ LANGUAGE sql STABLE;
```

## 3. Bật RLS trên toàn bộ bảng tenant-scoped

`tenants` cũng phải bật RLS. Policy `tenant_boundary` bên dưới là **RESTRICTIVE**, vì vậy mọi role policy đều phải đồng thời thỏa điều kiện tenant. Đây là điểm bắt buộc: các policy permissive không được dùng làm lớp tenant isolation.

```sql
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE branches ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE floors ENABLE ROW LEVEL SECURITY;
ALTER TABLE tables ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE unmatched_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE wallet_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE coffee_pass_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE coffee_pass_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE loyalty_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_vouchers ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
```

## 4. Policy tenant boundary

Các policy sau chỉ giới hạn tenant và quan hệ cha. Vì là `RESTRICTIVE`, chúng luôn được AND với các policy role ở mục 5.

```sql
CREATE POLICY tenant_boundary ON tenants AS RESTRICTIVE FOR ALL
  USING (id = auth.tenant_id()) WITH CHECK (id = auth.tenant_id());
CREATE POLICY tenant_boundary ON branches AS RESTRICTIVE FOR ALL
  USING (tenant_id = auth.tenant_id()) WITH CHECK (tenant_id = auth.tenant_id());
CREATE POLICY tenant_boundary ON users AS RESTRICTIVE FOR ALL
  USING (tenant_id = auth.tenant_id()) WITH CHECK (tenant_id = auth.tenant_id());
CREATE POLICY tenant_boundary ON customers AS RESTRICTIVE FOR ALL
  USING (tenant_id = auth.tenant_id()) WITH CHECK (tenant_id = auth.tenant_id());
CREATE POLICY tenant_boundary ON categories AS RESTRICTIVE FOR ALL
  USING (tenant_id = auth.tenant_id()) WITH CHECK (tenant_id = auth.tenant_id());
CREATE POLICY tenant_boundary ON products AS RESTRICTIVE FOR ALL
  USING (tenant_id = auth.tenant_id()) WITH CHECK (tenant_id = auth.tenant_id());
CREATE POLICY tenant_boundary ON orders AS RESTRICTIVE FOR ALL
  USING (tenant_id = auth.tenant_id()) WITH CHECK (tenant_id = auth.tenant_id());
CREATE POLICY tenant_boundary ON payment_transactions AS RESTRICTIVE FOR ALL
  USING (tenant_id = auth.tenant_id()) WITH CHECK (tenant_id = auth.tenant_id());
CREATE POLICY tenant_boundary ON support_tickets AS RESTRICTIVE FOR ALL
  USING (tenant_id = auth.tenant_id()) WITH CHECK (tenant_id = auth.tenant_id());
CREATE POLICY tenant_boundary ON audit_logs AS RESTRICTIVE FOR ALL
  USING (tenant_id = auth.tenant_id()) WITH CHECK (tenant_id = auth.tenant_id());
CREATE POLICY tenant_boundary ON coffee_pass_plans AS RESTRICTIVE FOR ALL
  USING (tenant_id = auth.tenant_id()) WITH CHECK (tenant_id = auth.tenant_id());
CREATE POLICY tenant_boundary ON floors AS RESTRICTIVE FOR ALL
  USING (EXISTS (SELECT 1 FROM branches b WHERE b.id = floors.branch_id AND b.tenant_id = auth.tenant_id()))
  WITH CHECK (EXISTS (SELECT 1 FROM branches b WHERE b.id = floors.branch_id AND b.tenant_id = auth.tenant_id()));
CREATE POLICY tenant_boundary ON tables AS RESTRICTIVE FOR ALL
  USING (EXISTS (SELECT 1 FROM floors f JOIN branches b ON b.id = f.branch_id WHERE f.id = tables.floor_id AND b.tenant_id = auth.tenant_id()))
  WITH CHECK (EXISTS (SELECT 1 FROM floors f JOIN branches b ON b.id = f.branch_id WHERE f.id = tables.floor_id AND b.tenant_id = auth.tenant_id()));
CREATE POLICY tenant_boundary ON order_items AS RESTRICTIVE FOR ALL
  USING (EXISTS (SELECT 1 FROM orders o WHERE o.id = order_items.order_id AND o.tenant_id = auth.tenant_id()))
  WITH CHECK (EXISTS (SELECT 1 FROM orders o WHERE o.id = order_items.order_id AND o.tenant_id = auth.tenant_id()));
CREATE POLICY tenant_boundary ON wallets AS RESTRICTIVE FOR ALL
  USING (EXISTS (SELECT 1 FROM customers c WHERE c.id = wallets.customer_id AND c.tenant_id = auth.tenant_id()))
  WITH CHECK (EXISTS (SELECT 1 FROM customers c WHERE c.id = wallets.customer_id AND c.tenant_id = auth.tenant_id()));
CREATE POLICY tenant_boundary ON wallet_transactions AS RESTRICTIVE FOR ALL
  USING (EXISTS (SELECT 1 FROM wallets w JOIN customers c ON c.id = w.customer_id WHERE w.id = wallet_transactions.wallet_id AND c.tenant_id = auth.tenant_id()))
  WITH CHECK (EXISTS (SELECT 1 FROM wallets w JOIN customers c ON c.id = w.customer_id WHERE w.id = wallet_transactions.wallet_id AND c.tenant_id = auth.tenant_id()));
CREATE POLICY tenant_boundary ON loyalty_transactions AS RESTRICTIVE FOR ALL
  USING (EXISTS (SELECT 1 FROM customers c WHERE c.id = loyalty_transactions.customer_id AND c.tenant_id = auth.tenant_id()))
  WITH CHECK (EXISTS (SELECT 1 FROM customers c WHERE c.id = loyalty_transactions.customer_id AND c.tenant_id = auth.tenant_id()));
CREATE POLICY tenant_boundary ON customer_vouchers AS RESTRICTIVE FOR ALL
  USING (EXISTS (SELECT 1 FROM customers c WHERE c.id = customer_vouchers.customer_id AND c.tenant_id = auth.tenant_id()))
  WITH CHECK (EXISTS (SELECT 1 FROM customers c WHERE c.id = customer_vouchers.customer_id AND c.tenant_id = auth.tenant_id()));
CREATE POLICY tenant_boundary ON coffee_pass_subscriptions AS RESTRICTIVE FOR ALL
  USING (EXISTS (SELECT 1 FROM customers c WHERE c.id = coffee_pass_subscriptions.customer_id AND c.tenant_id = auth.tenant_id()))
  WITH CHECK (EXISTS (SELECT 1 FROM customers c WHERE c.id = coffee_pass_subscriptions.customer_id AND c.tenant_id = auth.tenant_id()));
CREATE POLICY tenant_boundary ON unmatched_transactions AS RESTRICTIVE FOR ALL
  USING (EXISTS (SELECT 1 FROM payment_transactions p WHERE p.id = unmatched_transactions.payment_transaction_id AND p.tenant_id = auth.tenant_id()))
  WITH CHECK (EXISTS (SELECT 1 FROM payment_transactions p WHERE p.id = unmatched_transactions.payment_transaction_id AND p.tenant_id = auth.tenant_id()));
```

## 5. Policy theo role

Các policy role là permissive và được AND với `tenant_boundary`. Không có role policy nghĩa là mặc định bị từ chối.

```sql
-- Read-only resources
CREATE POLICY tenant_read ON branches FOR SELECT USING (auth.role_app() IN ('OWNER','STAFF','SUPPORT','CUSTOMER'));
CREATE POLICY owner_write ON branches FOR INSERT WITH CHECK (auth.role_app() = 'OWNER');
CREATE POLICY owner_update ON branches FOR UPDATE USING (auth.role_app() = 'OWNER') WITH CHECK (auth.role_app() = 'OWNER');
CREATE POLICY tenant_self_read ON tenants FOR SELECT USING (auth.role_app() IN ('OWNER','STAFF','SUPPORT','CUSTOMER'));
CREATE POLICY tenant_read ON floors FOR SELECT USING (auth.role_app() IN ('OWNER','STAFF','CUSTOMER'));
CREATE POLICY owner_write ON floors FOR INSERT WITH CHECK (auth.role_app() = 'OWNER');
CREATE POLICY owner_update ON floors FOR UPDATE USING (auth.role_app() = 'OWNER') WITH CHECK (auth.role_app() = 'OWNER');
CREATE POLICY tenant_read ON tables FOR SELECT USING (auth.role_app() IN ('OWNER','STAFF','CUSTOMER'));
CREATE POLICY owner_write ON tables FOR INSERT WITH CHECK (auth.role_app() = 'OWNER');
CREATE POLICY owner_update ON tables FOR UPDATE USING (auth.role_app() = 'OWNER') WITH CHECK (auth.role_app() = 'OWNER');
CREATE POLICY staff_status_update ON tables FOR UPDATE USING (auth.role_app() = 'STAFF') WITH CHECK (auth.role_app() = 'STAFF');
CREATE POLICY menu_read ON categories FOR SELECT USING (auth.role_app() IN ('OWNER','STAFF','CUSTOMER'));
CREATE POLICY owner_category_write ON categories FOR INSERT WITH CHECK (auth.role_app() = 'OWNER');
CREATE POLICY owner_category_update ON categories FOR UPDATE USING (auth.role_app() = 'OWNER') WITH CHECK (auth.role_app() = 'OWNER');
CREATE POLICY owner_category_delete ON categories FOR DELETE USING (auth.role_app() = 'OWNER');
CREATE POLICY menu_read ON products FOR SELECT USING (auth.role_app() IN ('OWNER','STAFF','CUSTOMER'));
CREATE POLICY owner_product_write ON products FOR INSERT WITH CHECK (auth.role_app() = 'OWNER');
CREATE POLICY owner_product_update ON products FOR UPDATE USING (auth.role_app() = 'OWNER') WITH CHECK (auth.role_app() = 'OWNER');
CREATE POLICY coffee_pass_plan_read ON coffee_pass_plans FOR SELECT USING (auth.role_app() IN ('OWNER','STAFF','CUSTOMER'));

-- Identity and staff
CREATE POLICY owner_staff_read ON users FOR SELECT USING (auth.role_app() = 'OWNER' OR auth.uid() = auth_user_id);
CREATE POLICY owner_staff_write ON users FOR INSERT WITH CHECK (auth.role_app() = 'OWNER');
CREATE POLICY owner_staff_update ON users FOR UPDATE USING (auth.role_app() = 'OWNER') WITH CHECK (auth.role_app() = 'OWNER');
CREATE POLICY customer_own_profile ON customers FOR SELECT USING (auth.role_app() = 'CUSTOMER' AND auth.uid() = auth_user_id);
CREATE POLICY customer_update_profile ON customers FOR UPDATE USING (auth.role_app() = 'CUSTOMER' AND auth.uid() = auth_user_id) WITH CHECK (auth.role_app() = 'CUSTOMER' AND auth.uid() = auth_user_id);
CREATE POLICY owner_support_customer_read ON customers FOR SELECT USING (auth.role_app() IN ('OWNER','SUPPORT'));

-- Orders and order items
CREATE POLICY order_read ON orders FOR SELECT USING (
  (auth.role_app() = 'CUSTOMER' AND customer_id = (SELECT id FROM customers WHERE auth_user_id = auth.uid()))
  OR (auth.role_app() = 'OWNER')
  OR (auth.role_app() = 'STAFF' AND branch_id = auth.branch_id())
);
CREATE POLICY staff_order_insert ON orders FOR INSERT WITH CHECK (auth.role_app() = 'STAFF' AND branch_id = auth.branch_id());
CREATE POLICY order_update ON orders FOR UPDATE USING (
  (auth.role_app() = 'CUSTOMER' AND customer_id = (SELECT id FROM customers WHERE auth_user_id = auth.uid()))
  OR (auth.role_app() = 'OWNER')
  OR (auth.role_app() = 'STAFF' AND branch_id = auth.branch_id())
) WITH CHECK (branch_id = auth.branch_id() OR auth.role_app() = 'CUSTOMER');
CREATE POLICY order_item_read ON order_items FOR SELECT USING (
  auth.role_app() IN ('OWNER','STAFF')
  OR EXISTS (SELECT 1 FROM orders o WHERE o.id = order_items.order_id AND o.customer_id = (SELECT id FROM customers WHERE auth_user_id = auth.uid()))
);
CREATE POLICY order_item_write ON order_items FOR INSERT WITH CHECK (
  auth.role_app() = 'STAFF'
  OR (auth.role_app() = 'CUSTOMER' AND EXISTS (SELECT 1 FROM orders o WHERE o.id = order_items.order_id AND o.customer_id = (SELECT id FROM customers WHERE auth_user_id = auth.uid())))
);
CREATE POLICY order_item_update ON order_items FOR UPDATE USING (
  auth.role_app() IN ('OWNER','STAFF')
  OR (auth.role_app() = 'CUSTOMER' AND EXISTS (SELECT 1 FROM orders o WHERE o.id = order_items.order_id AND o.customer_id = (SELECT id FROM customers WHERE auth_user_id = auth.uid())))
) WITH CHECK (auth.role_app() IN ('OWNER','STAFF','CUSTOMER'));
CREATE POLICY payment_read ON payment_transactions FOR SELECT USING (auth.role_app() IN ('OWNER','STAFF','SUPPORT')) OR matched_customer_id = (SELECT id FROM customers WHERE auth_user_id = auth.uid());

-- Customer financial data
CREATE POLICY own_wallet_read ON wallets FOR SELECT USING (auth.role_app() = 'CUSTOMER' AND customer_id = (SELECT id FROM customers WHERE auth_user_id = auth.uid()));
CREATE POLICY own_wallet_tx_read ON wallet_transactions FOR SELECT USING (auth.role_app() = 'CUSTOMER' AND wallet_id = (SELECT w.id FROM wallets w JOIN customers c ON c.id = w.customer_id WHERE c.auth_user_id = auth.uid()));
CREATE POLICY own_pass_read ON coffee_pass_subscriptions FOR SELECT USING (auth.role_app() = 'CUSTOMER' AND customer_id = (SELECT id FROM customers WHERE auth_user_id = auth.uid()));
CREATE POLICY own_voucher_read ON customer_vouchers FOR SELECT USING (auth.role_app() = 'CUSTOMER' AND customer_id = (SELECT id FROM customers WHERE auth_user_id = auth.uid()));
CREATE POLICY customer_loyalty_read ON loyalty_transactions FOR SELECT USING (auth.role_app() = 'CUSTOMER' AND customer_id = (SELECT id FROM customers WHERE auth_user_id = auth.uid()));

-- Support and audit
CREATE POLICY support_unmatched_access ON unmatched_transactions FOR ALL USING (auth.role_app() IN ('SUPPORT','OWNER')) WITH CHECK (auth.role_app() IN ('SUPPORT','OWNER'));
CREATE POLICY support_ticket_access ON support_tickets FOR SELECT USING (auth.role_app() IN ('SUPPORT','OWNER') OR customer_id = (SELECT id FROM customers WHERE auth_user_id = auth.uid()));
CREATE POLICY customer_csat_insert ON support_tickets FOR INSERT WITH CHECK (auth.role_app() = 'CUSTOMER' AND customer_id = (SELECT id FROM customers WHERE auth_user_id = auth.uid()));
CREATE POLICY support_ticket_update ON support_tickets FOR UPDATE USING (auth.role_app() IN ('SUPPORT','OWNER')) WITH CHECK (auth.role_app() IN ('SUPPORT','OWNER'));
CREATE POLICY audit_insert ON audit_logs FOR INSERT WITH CHECK (auth.role_app() IN ('OWNER','STAFF','SUPPORT'));
CREATE POLICY owner_audit_read ON audit_logs FOR SELECT USING (auth.role_app() = 'OWNER');
```

> `custom_access_token_hook`, `fn_update_customer_after_order` và `fn_merge_customer_profiles` phải là `SECURITY DEFINER`, có `SET search_path = public`, và được cấp quyền execute phù hợp. Các thao tác tài chính (topup, payment, redeem, approve unmatched) không được cho client tự ghi số dư; hãy thực hiện qua service method có transaction hoặc RPC `SECURITY DEFINER` với kiểm tra actor, tenant, số tiền và idempotency. Route người dùng luôn dùng anon key + JWT thật; chỉ seed, webhook mock và job hệ thống mới dùng service role/server transaction được kiểm soát.
