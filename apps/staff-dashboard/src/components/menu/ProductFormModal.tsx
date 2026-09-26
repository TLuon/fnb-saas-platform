import React, { useState, useEffect, useRef } from 'react';
import { X, Upload, Trash2, Loader2 } from 'lucide-react';
import type { Product, Category } from '../../store/menuStore';
import { useMenuStore } from '../../store/menuStore';

interface ProductFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: Omit<Product, 'id'>) => Promise<void>;
  categories: Category[];
  initialData?: Product | null;
}

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB

export function ProductFormModal({
  isOpen,
  onClose,
  onSubmit,
  categories,
  initialData,
}: ProductFormModalProps) {
  const uploadImage = useMenuStore((state) => state.uploadImage);

  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [imageUrl, setImageUrl] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState('');

  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        setName(initialData.name);
        setPrice(initialData.price.toString());
        setCategoryId(initialData.categoryId || (initialData as any).category_id || '');
        setIsActive(initialData.is_active ?? initialData.active ?? true);
        setImageUrl(initialData.image_url || '');
        setPreviewUrl(initialData.image_url || '');
      } else {
        setName('');
        setPrice('');
        setCategoryId(categories.length > 0 ? categories[0].id : '');
        setIsActive(true);
        setImageUrl('');
        setPreviewUrl('');
      }
      setSelectedFile(null);
      setError('');
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  }, [isOpen, initialData, categories]);

  // Clean up object URLs to avoid memory leaks
  useEffect(() => {
    return () => {
      if (previewUrl && previewUrl.startsWith('blob:')) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!ALLOWED_MIME_TYPES.includes(file.type.toLowerCase())) {
      setError('Định dạng file không hợp lệ. Chỉ chấp nhận JPG, PNG, WebP hoặc GIF.');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    if (file.size > MAX_FILE_SIZE) {
      setError('Kích thước file vượt quá 5 MB.');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    setError('');
    setSelectedFile(file);

    if (previewUrl && previewUrl.startsWith('blob:')) {
      URL.revokeObjectURL(previewUrl);
    }
    const newPreview = URL.createObjectURL(file);
    setPreviewUrl(newPreview);
  };

  const handleRemoveImage = () => {
    if (previewUrl && previewUrl.startsWith('blob:')) {
      URL.revokeObjectURL(previewUrl);
    }
    setSelectedFile(null);
    setPreviewUrl('');
    setImageUrl('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Vui lòng nhập tên món');
      return;
    }
    if (!price || isNaN(Number(price))) {
      setError('Giá không hợp lệ');
      return;
    }
    if (!categoryId) {
      setError('Vui lòng chọn danh mục');
      return;
    }

    try {
      setLoading(true);
      setError('');

      let finalImageUrl = imageUrl;

      // 1. If a new file is chosen, upload to Cloudinary via Backend API first
      if (selectedFile) {
        setUploading(true);
        try {
          finalImageUrl = await uploadImage(selectedFile);
        } catch (uploadErr: any) {
          setError(uploadErr.message || 'Lỗi khi tải ảnh lên máy chủ');
          setLoading(false);
          setUploading(false);
          return;
        } finally {
          setUploading(false);
        }
      }

      // 2. Submit product details with image_url
      await onSubmit({
        name: name.trim(),
        price: Number(price),
        categoryId,
        category_id: categoryId,
        active: isActive,
        is_active: isActive,
        image_url: finalImageUrl || '',
      });

      onClose();
    } catch (err: any) {
      setError(err.message || 'Có lỗi xảy ra khi lưu món ăn');
    } finally {
      setLoading(false);
      setUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-[var(--color-brand-neutral)] shrink-0">
          <h3 className="text-xl font-bold font-serif text-[var(--color-brand-primary)]">
            {initialData ? 'Chỉnh sửa món ăn' : 'Thêm món ăn mới'}
          </h3>
          <button
            onClick={onClose}
            className="p-1 text-gray-500 hover:text-[var(--color-brand-error)] transition-colors disabled:opacity-50"
            disabled={loading}
          >
            <X size={20} />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto">
          {error && (
            <div data-testid="product-form-error" className="p-3 bg-red-50 text-[var(--color-brand-error)] text-sm rounded-xl font-medium border border-red-100">
              {error}
            </div>
          )}

          {/* Product Image Field */}
          <div>
            <label className="block text-sm font-semibold text-gray-800 mb-1.5">
              Hình ảnh món ăn
            </label>
            <input
              data-testid="product-image-file-input"
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept="image/jpeg,image/png,image/webp,image/gif"
              className="hidden"
              disabled={loading}
            />

            {previewUrl ? (
              <div data-testid="product-image-preview" className="relative rounded-2xl overflow-hidden border border-gray-200 group bg-gray-50">
                <img
                  src={previewUrl}
                  alt="Xem trước ảnh món ăn"
                  className="w-full h-44 object-cover transition-transform group-hover:scale-[1.01]"
                />

                {/* Uploading Overlay */}
                {uploading && (
                  <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center text-white p-4">
                    <Loader2 className="w-8 h-8 animate-spin mb-2" />
                    <span className="text-sm font-semibold">Đang tải ảnh lên Cloudinary...</span>
                  </div>
                )}

                {/* Actions Bar */}
                {!uploading && (
                  <div className="absolute bottom-2 right-2 flex items-center gap-2 bg-black/60 backdrop-blur-md p-1.5 rounded-xl">
                    <button
                      data-testid="change-image-btn"
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={loading}
                      className="px-3 py-1 bg-white text-gray-800 text-xs font-bold rounded-lg hover:bg-gray-100 transition shadow-sm"
                    >
                      Thay đổi
                    </button>
                    <button
                      data-testid="remove-image-btn"
                      type="button"
                      onClick={handleRemoveImage}
                      disabled={loading}
                      className="p-1 text-white hover:text-red-400 transition rounded-lg"
                      title="Xóa ảnh"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                )}

                {/* State badge */}
                {selectedFile && !uploading && (
                  <div className="absolute top-2 left-2 bg-[var(--color-brand-primary)] text-white text-[11px] font-bold px-2.5 py-1 rounded-lg shadow-sm">
                    Ảnh mới sẵn sàng lưu
                  </div>
                )}
              </div>
            ) : (
              <div
                data-testid="image-upload-dropzone"
                onClick={() => !loading && fileInputRef.current?.click()}
                className="border-2 border-dashed border-gray-300 hover:border-[var(--color-brand-primary)] bg-gray-50/60 hover:bg-gray-50 rounded-2xl p-6 text-center cursor-pointer transition flex flex-col items-center justify-center gap-2 group"
              >
                <div className="w-12 h-12 rounded-full bg-white shadow-sm flex items-center justify-center text-gray-400 group-hover:text-[var(--color-brand-primary)] group-hover:scale-110 transition">
                  <Upload size={22} />
                </div>
                <div>
                  <p className="text-sm font-bold text-gray-700 group-hover:text-[var(--color-brand-primary)] transition">
                    Tải ảnh món ăn lên
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    Hỗ trợ JPG, PNG, WebP, GIF (tối đa 5 MB)
                  </p>
                </div>
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-800 mb-1">Tên món *</label>
            <input
              data-testid="product-name-input"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[var(--color-brand-secondary)] focus:border-transparent outline-none transition-all"
              placeholder="VD: Cà phê sữa đá"
              disabled={loading}
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-800 mb-1">Danh mục *</label>
            <select
              data-testid="product-category-select"
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[var(--color-brand-secondary)] focus:border-transparent outline-none transition-all bg-white"
              disabled={loading}
            >
              <option value="" disabled>-- Chọn danh mục --</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-800 mb-1">Giá bán (VNĐ) *</label>
            <input
              data-testid="product-price-input"
              type="number"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[var(--color-brand-secondary)] focus:border-transparent outline-none transition-all"
              placeholder="VD: 35000"
              disabled={loading}
            />
          </div>

          <div className="flex items-center gap-3 pt-2">
            <button
              type="button"
              onClick={() => setIsActive(!isActive)}
              disabled={loading}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
                isActive ? 'bg-[var(--color-brand-primary)]' : 'bg-gray-300'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  isActive ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
            <span className="text-sm font-semibold text-gray-700">Đang bán (Active)</span>
          </div>

          {/* Footer Buttons */}
          <div className="pt-4 border-t border-gray-100 flex justify-end gap-3 shrink-0">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-5 py-2.5 text-gray-600 font-semibold rounded-xl hover:bg-gray-50 transition-colors"
            >
              Hủy
            </button>
            <button
              data-testid="product-submit-btn"
              type="submit"
              disabled={loading}
              className="px-5 py-2.5 bg-[var(--color-brand-primary)] text-white font-bold rounded-xl hover:bg-[var(--color-brand-secondary)] transition-colors shadow-sm disabled:opacity-50 flex items-center gap-2"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              {loading ? (uploading ? 'Đang tải ảnh...' : 'Đang lưu...') : 'Lưu lại'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
