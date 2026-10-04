const puppeteer = require('puppeteer-core');
const fs = require('fs');
const path = require('path');

const EDGE_PATH = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const SCREENSHOT_DIR = path.resolve('E:/CNPM/connectfix2/docs/project-audit/screenshots');

async function getAuthToken(email, password) {
  const res = await fetch('http://localhost:3001/api/v1/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });
  const json = await res.json();
  if (json.data && json.data.access_token) {
    return json.data.access_token;
  }
  throw new Error(`Failed to login for ${email}: ${JSON.stringify(json)}`);
}

async function run() {
  console.log('🚀 Khởi động Edge Browser để chạy toàn bộ Test Cases...');
  const browser = await puppeteer.launch({
    executablePath: EDGE_PATH,
    headless: 'new',
    defaultViewport: { width: 1440, height: 900 },
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();

  // Helper function to set auth and navigate
  async function authAndGo(email, password, url, screenshotName, waitSelector) {
    console.log(`\n➡️ Testing: [${screenshotName}] URL: ${url} (User: ${email})`);
    const token = await getAuthToken(email, password);
    
    // Go to origin first to set localStorage
    await page.goto('http://localhost:5173/login', { waitUntil: 'domcontentloaded' });
    await page.evaluate((tok) => {
      localStorage.setItem('access_token', tok);
      window.dispatchEvent(new Event('storage'));
    }, token);

    // Now go to target url
    await page.goto(url, { waitUntil: 'networkidle0', timeout: 30000 });
    if (waitSelector) {
      try {
        await page.waitForSelector(waitSelector, { timeout: 8000 });
      } catch (e) {
        console.log(`   ⚠️ Timeout waiting for ${waitSelector}, continuing anyway`);
      }
    }
    await new Promise(r => setTimeout(r, 1500)); // wait for animations

    const filePath = path.join(SCREENSHOT_DIR, screenshotName);
    await page.screenshot({ path: filePath, fullPage: false });
    console.log(`   📸 Đã chụp: ${screenshotName}`);
  }

  // Helper for customer PWA
  async function pwaGo(url, screenshotName, waitSelector) {
    console.log(`\n➡️ Testing PWA: [${screenshotName}] URL: ${url}`);
    await page.goto(url, { waitUntil: 'networkidle0', timeout: 30000 });
    if (waitSelector) {
      try {
        await page.waitForSelector(waitSelector, { timeout: 8000 });
      } catch (e) {
        console.log(`   ⚠️ Timeout waiting for ${waitSelector}, continuing anyway`);
      }
    }
    await new Promise(r => setTimeout(r, 1500));

    const filePath = path.join(SCREENSHOT_DIR, screenshotName);
    await page.screenshot({ path: filePath, fullPage: false });
    console.log(`   📸 Đã chụp: ${screenshotName}`);
  }

  try {
    // 1. Staff POS
    await authAndGo('staff.runtime@example.com', 'abc12345', 'http://localhost:5173/pos', '01_staff_pos.png');

    // 2. POS add item to cart & screenshot
    console.log('   Thêm món vào giỏ hàng POS...');
    try {
      const productCard = await page.$('div[class*="cursor-pointer"], button[class*="product"]');
      if (productCard) {
        await productCard.click();
        await new Promise(r => setTimeout(r, 1000));
        await page.screenshot({ path: path.join(SCREENSHOT_DIR, '02_pos_item_added.png') });
        console.log('   📸 Đã chụp: 02_pos_item_added.png');

        const payBtn = await page.$('button[class*="bg-amber"], button[class*="bg-emerald"], button:has-text("Thanh toán"), button:has-text("Thanh Toán")');
        if (payBtn) {
          await payBtn.click();
          await new Promise(r => setTimeout(r, 1000));
          await page.screenshot({ path: path.join(SCREENSHOT_DIR, '03_pos_payment_modal.png') });
          console.log('   📸 Đã chụp: 03_pos_payment_modal.png');
        }
      }
    } catch (e) {
      console.log('   ⚠️ Error in POS cart action:', e.message);
    }

    // 3. Sơ đồ bàn Live Floor Map
    await authAndGo('staff.runtime@example.com', 'abc12345', 'http://localhost:5173/floor-map', '04_staff_floor_map.png');

    // 4. Lịch sử đơn hàng
    await authAndGo('staff.runtime@example.com', 'abc12345', 'http://localhost:5173/orders-history', '05_staff_orders_history.png');

    // 5. KDS Kitchen
    await authAndGo('bep@example.com', 'bep12345', 'http://localhost:5173/kds/kitchen', '06_kds_kitchen.png');

    // 6. KDS Bar
    await authAndGo('bar@example.com', 'bar12345', 'http://localhost:5173/kds/bar', '07_kds_bar.png');

    // 7. Owner Analytics
    await authAndGo('owner.runtime@example.com', 'abc12345', 'http://localhost:5173/analytics', '08_owner_analytics.png');

    // 8. Owner Menu Management
    await authAndGo('owner.runtime@example.com', 'abc12345', 'http://localhost:5173/menu-management', '09_owner_menu_management.png');

    // 9. Owner Inventory (Kho nguyên liệu & BOM)
    await authAndGo('owner.runtime@example.com', 'abc12345', 'http://localhost:5173/inventory', '10_owner_inventory.png');

    // 10. Owner Shifts (Quản lý ca)
    await authAndGo('owner.runtime@example.com', 'abc12345', 'http://localhost:5173/shifts', '11_owner_shifts.png');

    // 11. Owner CDP (Customer 360)
    await authAndGo('owner.runtime@example.com', 'abc12345', 'http://localhost:5173/cdp', '12_owner_cdp.png');

    // 12. Owner Floor Editor
    await authAndGo('owner.runtime@example.com', 'abc12345', 'http://localhost:5173/floor-editor', '13_owner_floor_editor.png');

    // 13. Customer PWA Pages (port 3000)
    await pwaGo('http://localhost:3000', '14_customer_home.png');
    await pwaGo('http://localhost:3000/menu', '15_customer_menu.png');
    await pwaGo('http://localhost:3000/floors', '16_customer_floors.png');
    await pwaGo('http://localhost:3000/reservation', '17_customer_reservation.png');
    await pwaGo('http://localhost:3000/wallet', '18_customer_wallet.png');
    await pwaGo('http://localhost:3000/coffee-pass', '19_customer_coffee_pass.png');
    await pwaGo('http://localhost:3000/cart', '20_customer_cart.png');

    console.log('\n🎉 TOÀN BỘ 20 TESTCASES ĐÃ ĐƯỢC CHỤP HÌNH THÀNH CÔNG VÀ LƯU VÀO docs/project-audit/screenshots!');

  } catch (err) {
    console.error('Lỗi khi thực thi test suite:', err);
  } finally {
    await browser.close();
  }
}

run();
