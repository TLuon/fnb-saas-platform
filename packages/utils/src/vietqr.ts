export const VIETCOMBANK_CONFIG = {
  bankId: 'vietcombank', // Official Vietcombank slug for vietqr.io (BIN: 970436)
  bankName: 'Vietcombank (Ngân hàng TMCP Ngoại thương Việt Nam)',
  accountNo: '9344566957',
  accountName: 'TRAN THANH LUON',
  template: 'compact2',
};


/**
 * Tạo URL ảnh VietQR chuẩn ngân hàng Việt Nam dựa trên VietQR API (vietqr.io)
 * @param amount Số tiền chuyển khoản (VNĐ)
 * @param memo Nội dung chuyển khoản (Ví dụ: DH 1002 hoặc DATBAN RES-4921)
 */
export function generateVietQRUrl(amount: number, memo: string): string {
  const safeAmount = Math.max(0, Math.round(amount));
  // Clean special characters from memo for bank scanner compatibility
  const cleanMemo = memo.trim().replace(/[^a-zA-Z0-9\s_-]/g, '');
  const safeMemo = encodeURIComponent(cleanMemo);
  const safeName = encodeURIComponent(VIETCOMBANK_CONFIG.accountName);
  return `https://img.vietqr.io/image/${VIETCOMBANK_CONFIG.bankId}-${VIETCOMBANK_CONFIG.accountNo}-${VIETCOMBANK_CONFIG.template}.png?amount=${safeAmount}&addInfo=${safeMemo}&accountName=${safeName}`;
}

