import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { MenuService } from './menu.service.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { CurrentAccessToken, CurrentUser } from '../../common/decorators/current-user.decorator.js';
import type { AuthenticatedUser } from '../../common/types/auth.types.js';
import { CreateCategoryDto } from './dto/create-category.dto.js';
import { UpdateCategoryDto } from './dto/update-category.dto.js';
import { CreateProductDto } from './dto/create-product.dto.js';
import { UpdateProductDto } from './dto/update-product.dto.js';
import { ListProductsQueryDto } from './dto/list-products-query.dto.js';

@Controller()
export class MenuController {
  constructor(private readonly menuService: MenuService) {}

  @Roles('OWNER', 'STAFF', 'CUSTOMER')
  @Get('categories')
  listCategories(@CurrentAccessToken() token: string) {
    return this.menuService.listCategories(token);
  }

  @Roles('OWNER')
  @Post('categories')
  createCategory(@Body() dto: CreateCategoryDto, @CurrentUser() user: AuthenticatedUser, @CurrentAccessToken() token: string) {
    return this.menuService.createCategory(token, user.tenant_id, dto);
  }

  @Roles('OWNER')
  @Patch('categories/:id')
  updateCategory(@Param('id') id: string, @Body() dto: UpdateCategoryDto, @CurrentAccessToken() token: string) {
    return this.menuService.updateCategory(token, id, dto);
  }

  @Roles('OWNER')
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

  @Roles('OWNER')
  @Post('products')
  createProduct(@Body() dto: CreateProductDto, @CurrentUser() user: AuthenticatedUser, @CurrentAccessToken() token: string) {
    return this.menuService.createProduct(token, user.tenant_id, dto);
  }

  @Roles('OWNER')
  @Patch('products/:id')
  updateProduct(@Param('id') id: string, @Body() dto: UpdateProductDto, @CurrentAccessToken() token: string) {
    return this.menuService.updateProduct(token, id, dto);
  }

  @Roles('OWNER')
  @Delete('products/:id')
  deactivateProduct(@Param('id') id: string, @CurrentAccessToken() token: string) {
    return this.menuService.deactivateProduct(token, id);
  }
}
