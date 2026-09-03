-- ============================================================
-- 001_init.sql
-- Nguồn: ERD.md mục 2 (DDL đầy đủ)
-- Chạy 1 lần duy nhất trên Supabase SQL Editor. Không sửa lại
-- file này sau khi đã chạy — mọi thay đổi sau đó phải là
-- migration mới (002_xxx.sql, 003_xxx.sql...) theo PLAN_BE.md mục 1.
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm"; -- hỗ trợ so khớp mờ (thay Levenshtein)

-- ============ TENANCY ============

CREATE TABLE tenants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    subdomain VARCHAR(100) UNIQUE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE branches (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    address TEXT,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- ============ IDENTITY ============

-- Tài khoản nội bộ (OWNER / STAFF / SUPPORT). CUSTOMER dùng bảng `customers`.
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    auth_user_id UUID UNIQUE NOT NULL, -- liên kết auth.users của Supabase
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    branch_id UUID REFERENCES branches(id) ON DELETE SET NULL,
    full_name VARCHAR(150) NOT NULL,
    role VARCHAR(20) NOT NULL CHECK (role IN ('OWNER','STAFF','SUPPORT')),
    phone VARCHAR(20),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_users_tenant ON users(tenant_id);
CREATE UNIQUE INDEX idx_users_tenant_phone ON users(tenant_id, phone) WHERE phone IS NOT NULL;

CREATE TABLE customers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    auth_user_id UUID UNIQUE, -- liên kết auth.users, NULL nếu khách vãng lai chưa đăng ký
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    phone VARCHAR(20) NOT NULL,
    full_name VARCHAR(150),
    email VARCHAR(150),
    membership_tier VARCHAR(20) DEFAULT 'STANDARD' CHECK (membership_tier IN ('STANDARD','SILVER','GOLD','DIAMOND')),
    loyalty_points INT DEFAULT 0,
    total_spent NUMERIC(15,2) DEFAULT 0.00,
    total_visits INT DEFAULT 0,
    first_visit_at TIMESTAMPTZ,
    last_visit_at TIMESTAMPTZ,
    favorite_items JSONB DEFAULT '[]'::jsonb,
    dietary_notes TEXT,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_tenant_phone UNIQUE (tenant_id, phone)
);
CREATE INDEX idx_customers_phone ON customers(phone);
CREATE INDEX idx_customers_tenant ON customers(tenant_id);

-- ============ FLOOR MAP ============

CREATE TABLE floors (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    branch_id UUID REFERENCES branches(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    floor_level INT NOT NULL,
    background_svg TEXT,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE tables (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    floor_id UUID REFERENCES floors(id) ON DELETE CASCADE,
    table_code VARCHAR(50) NOT NULL,
    capacity INT DEFAULT 4,
    pos_x FLOAT NOT NULL,
    pos_y FLOAT NOT NULL,
    width FLOAT DEFAULT 80.0,
    height FLOAT DEFAULT 80.0,
    shape VARCHAR(20) DEFAULT 'RECTANGLE',
    status VARCHAR(20) DEFAULT 'AVAILABLE' CHECK (status IN ('AVAILABLE','PENDING_LOCK','RESERVED','OCCUPIED','CLEANING')),
    current_order_id UUID,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_tables_floor ON tables(floor_id);

-- ============ MENU ============

CREATE TABLE categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    kitchen_station VARCHAR(20) NOT NULL CHECK (kitchen_station IN ('BAR','KITCHEN')),
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX idx_categories_tenant_name ON categories(tenant_id, name);

CREATE TABLE products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
    name VARCHAR(255) NOT NULL,
    price NUMERIC(15,2) NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    default_modifiers JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_products_tenant ON products(tenant_id);

-- ============ ORDERS ============

CREATE TABLE orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    branch_id UUID REFERENCES branches(id) ON DELETE CASCADE,
    table_id UUID REFERENCES tables(id),
    customer_id UUID REFERENCES customers(id),
    order_code VARCHAR(50) UNIQUE NOT NULL,
    order_type VARCHAR(20) DEFAULT 'DINE_IN' CHECK (order_type IN ('DINE_IN','TAKEAWAY')),
    status VARCHAR(20) DEFAULT 'PENDING' CHECK (status IN ('PENDING','IN_PROGRESS','COMPLETED','CANCELLED')),
    subtotal NUMERIC(15,2) DEFAULT 0.00,
    discount_amount NUMERIC(15,2) DEFAULT 0.00,
    final_amount NUMERIC(15,2) DEFAULT 0.00,
    points_earned INT DEFAULT 0,
    points_redeemed INT DEFAULT 0,
    payment_method VARCHAR(30) CHECK (payment_method IN ('VIETQR','WALLET','COFFEE_PASS')),
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_orders_tenant ON orders(tenant_id);
CREATE INDEX idx_orders_table ON orders(table_id);

CREATE TABLE order_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id),
    product_name VARCHAR(255) NOT NULL,
    quantity INT NOT NULL DEFAULT 1,
    unit_price NUMERIC(15,2) NOT NULL,
    modifiers JSONB DEFAULT '[]'::jsonb,
    kitchen_status VARCHAR(20) DEFAULT 'QUEUED' CHECK (kitchen_status IN ('QUEUED','PREPARING','READY','SERVED')),
    added_by_customer_id UUID REFERENCES customers(id), -- phục vụ Group-Order: ai trong bàn thêm món này
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- ============ PAYMENTS ============

CREATE TABLE payment_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    order_id UUID REFERENCES orders(id),
    reservation_code VARCHAR(50), -- mã RES_XXXXX khi là tiền cọc đặt bàn
    amount NUMERIC(15,2) NOT NULL,
    raw_transfer_content TEXT, -- nội dung chuyển khoản thực tế nhận từ webhook
    status VARCHAR(20) DEFAULT 'PENDING' CHECK (status IN ('PENDING','MATCHED','UNMATCHED','COMPLETED','FAILED')),
    matched_customer_id UUID REFERENCES customers(id),
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_payment_tx_status ON payment_transactions(status);

CREATE TABLE unmatched_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    payment_transaction_id UUID REFERENCES payment_transactions(id) ON DELETE CASCADE,
    suggested_customer_id UUID REFERENCES customers(id),
    similarity_score FLOAT, -- kết quả thuật toán Levenshtein/pg_trgm
    maker_user_id UUID REFERENCES users(id),
    maker_proposed_at TIMESTAMPTZ,
    checker_user_id UUID REFERENCES users(id),
    checker_approved_at TIMESTAMPTZ,
    status VARCHAR(20) DEFAULT 'PENDING' CHECK (status IN ('PENDING','PROPOSED','APPROVED','REJECTED')),
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- ============ WALLET & COFFEE PASS ============

CREATE TABLE wallets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    customer_id UUID UNIQUE REFERENCES customers(id) ON DELETE CASCADE,
    main_balance NUMERIC(15,2) DEFAULT 0.00,     -- ví gốc (doanh thu thực khi tiêu)
    promo_balance NUMERIC(15,2) DEFAULT 0.00,    -- ví khuyến mãi (chi phí marketing khi tiêu)
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE wallet_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    wallet_id UUID REFERENCES wallets(id) ON DELETE CASCADE,
    order_id UUID REFERENCES orders(id),
    type VARCHAR(20) NOT NULL CHECK (type IN ('TOPUP','PAYMENT','REFUND','PROMO_CREDIT')),
    balance_type VARCHAR(10) NOT NULL CHECK (balance_type IN ('MAIN','PROMO')),
    amount NUMERIC(15,2) NOT NULL,
    balance_after NUMERIC(15,2) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE coffee_pass_plans (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    name VARCHAR(150) NOT NULL,
    total_redemptions INT NOT NULL,
    price NUMERIC(15,2) NOT NULL,
    valid_days INT NOT NULL
);

CREATE TABLE coffee_pass_subscriptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
    plan_id UUID REFERENCES coffee_pass_plans(id),
    remaining_redemptions INT NOT NULL,
    totp_secret VARCHAR(64) NOT NULL, -- secret sinh mã TOTP 30s
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- ============ LOYALTY / CDP ============

CREATE TABLE loyalty_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
    order_id UUID REFERENCES orders(id),
    type VARCHAR(20) NOT NULL CHECK (type IN ('EARN','REDEEM')),
    points INT NOT NULL,
    balance_after INT NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE customer_vouchers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
    source VARCHAR(20) NOT NULL CHECK (source IN ('CSAT_APOLOGY','CHURN_REENGAGEMENT','MANUAL')),
    discount_percent INT,
    free_item_product_id UUID REFERENCES products(id),
    is_used BOOLEAN DEFAULT FALSE,
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- ============ SUPPORT / CSKH ============

CREATE TABLE support_tickets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    order_id UUID REFERENCES orders(id),
    customer_id UUID REFERENCES customers(id),
    csat_score INT CHECK (csat_score BETWEEN 1 AND 5),
    complaint_note TEXT,
    priority VARCHAR(10) DEFAULT 'NORMAL' CHECK (priority IN ('NORMAL','URGENT')),
    status VARCHAR(20) DEFAULT 'OPEN' CHECK (status IN ('OPEN','IN_PROGRESS','RESOLVED')),
    assigned_to UUID REFERENCES users(id),
    resolution_note TEXT,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    actor_user_id UUID REFERENCES users(id),
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(50),
    entity_id UUID,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- Hết 001_init.sql — tiếp theo chạy 002_functions.sql
-- ============================================================
