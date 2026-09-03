import { registerDecorator, ValidationOptions } from 'class-validator';

/**
 * Kiểm tra định dạng UUID (8-4-4-4-12 hex) nhưng KHÔNG bắt buộc đúng
 * chuẩn RFC4122 (version/variant nibble) như @IsUUID() của
 * class-validator.
 *
 * LÝ DO: seed.sql (SETUP.md mục 9) dùng UUID dễ đọc để demo, ví dụ
 * '22222222-2222-2222-2222-222222222222' cho branch_id. Postgres chấp
 * nhận giá trị này bình thường (kiểu `uuid` chỉ cần đúng 32 ký tự hex),
 * nhưng @IsUUID() mặc định của class-validator đòi hỏi "variant nibble"
 * (ký tự đầu nhóm thứ 4) phải là 8/9/a/b theo đúng RFC4122 — UUID giả
 * lập trong seed KHÔNG thỏa điều kiện này nên bị từ chối sai. Toàn bộ
 * DTO tham chiếu tenant_id/branch_id/floor_id/category_id... dùng
 * decorator này thay vì @IsUUID() để tương thích với seed data thật
 * của dự án. UUID thật do `uuid_generate_v4()` sinh ra vẫn thỏa mãn
 * bình thường (là tập con của định dạng lỏng hơn này).
 */
export function IsUuidLoose(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'isUuidLoose',
      target: object.constructor,
      propertyName,
      options: validationOptions,
      validator: {
        validate(value: unknown) {
          return (
            typeof value === 'string' &&
            /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(
              value,
            )
          );
        },
        defaultMessage() {
          return `${propertyName} must be a UUID-formatted string`;
        },
      },
    });
  };
}
