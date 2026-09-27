import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { MenuService } from './menu.service.js';
import type { UploadedImageFile } from '../../common/cloudinary/cloudinary.service.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { Public } from '../../common/decorators/public.decorator.js';
import { CurrentAccessToken, CurrentUser } from '../../common/decorators/current-user.decorator.js';
import type { AuthenticatedUser } from '../../common/types/auth.types.js';
import { CreateCategoryDto } from './dto/create-category.dto.js';
import { UpdateCategoryDto } from './dto/update-category.dto.js';
import { CreateProductDto } from './dto/create-product.dto.js';
import { UpdateProductDto } from './dto/update-product.dto.js';
import { ListProductsQueryDto } from './dto/list-products-query.dto.js';
import { PublicCatalogQueryDto } from './dto/public-catalog-query.dto.js';

@Controller()
export class MenuController {
  constructor(private readonly menuService: MenuService) {}

  /** B1.md P2.3 — GET /public/catalog?tenant_subdomain=&branch_id= (Public cho khách vãng lai). */
  @Public()
  @Get('public/catalog')
  getPublicCatalog(@Query() query: PublicCatalogQueryDto) {
    return this.menuService.getPublicCatalog(query.tenant_subdomain, query.branch_id);
  }

  @Roles('OWNER', 'STAFF', 'CUSTOMER')
  @Get('categories')
  listCategories(@CurrentAccessToken() token: string) {
    return this.menuService.listCategories(token);
  }

  @Roles('OWNER', 'STAFF')
  @Post('categories')
  createCategory(@Body() dto: CreateCategoryDto, @CurrentUser() user: AuthenticatedUser, @CurrentAccessToken() token: string) {
    return this.menuService.createCategory(token, user.tenant_id, dto);
  }

  @Roles('OWNER', 'STAFF')
  @Patch('categories/:id')
  updateCategory(@Param('id') id: string, @Body() dto: UpdateCategoryDto, @CurrentAccessToken() token: string) {
    return this.menuService.updateCategory(token, id, dto);
  }

  @Roles('OWNER', 'STAFF')
  @Delete('categories/:id')
  deleteCategory(@Param('id') id: string, @CurrentAccessToken() token: string) {
    return this.menuService.deleteCategory(token, id);
  }

  @Roles('OWNER', 'STAFF', 'CUSTOMER')
  @Get('products')
  listProducts(
    @Query() query: ListProductsQueryDto,
    @CurrentUser() user: AuthenticatedUser,
    @CurrentAccessToken() token: string,
  ) {
    return this.menuService.listProducts(token, user.role_app, query.category_id);
  }

  @Roles('OWNER', 'STAFF')
  @Post(['products/upload-image', 'products/upload'])
  @UseInterceptors(FileInterceptor('file'))
  uploadProductImage(@UploadedFile() file: UploadedImageFile) {
    return this.menuService.uploadImage(file);
  }

  @Roles('OWNER', 'STAFF')
  @Post('products')
  createProduct(@Body() dto: CreateProductDto, @CurrentUser() user: AuthenticatedUser, @CurrentAccessToken() token: string) {
    return this.menuService.createProduct(token, user.tenant_id, dto);
  }

  @Roles('OWNER', 'STAFF')
  @Patch('products/:id')
  updateProduct(@Param('id') id: string, @Body() dto: UpdateProductDto, @CurrentAccessToken() token: string) {
    return this.menuService.updateProduct(token, id, dto);
  }

  @Roles('OWNER', 'STAFF')
  @Delete('products/:id')
  deactivateProduct(@Param('id') id: string, @CurrentAccessToken() token: string) {
    return this.menuService.deactivateProduct(token, id);
  }
}
