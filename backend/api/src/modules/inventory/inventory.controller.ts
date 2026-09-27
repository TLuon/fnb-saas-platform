import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { InventoryService } from './inventory.service.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { CurrentAccessToken, CurrentUser } from '../../common/decorators/current-user.decorator.js';
import type { AuthenticatedUser } from '../../common/types/auth.types.js';
import { CreateIngredientDto } from './dto/create-ingredient.dto.js';
import { UpdateIngredientDto } from './dto/update-ingredient.dto.js';
import { CreateRecipeDto } from './dto/create-recipe.dto.js';
import { CreateTransactionDto } from './dto/create-transaction.dto.js';
import { ListIngredientsQueryDto } from './dto/list-ingredients-query.dto.js';
import { ListTransactionsQueryDto } from './dto/list-transactions-query.dto.js';

@Controller('inventory')
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  /** ── INGREDIENTS ── */

  @Roles('OWNER', 'STAFF')
  @Get('ingredients')
  listIngredients(
    @Query() query: ListIngredientsQueryDto,
    @CurrentAccessToken() token: string,
  ) {
    return this.inventoryService.listIngredients(token, query);
  }

  @Roles('OWNER', 'STAFF')
  @Get('ingredients/:id')
  getIngredient(
    @Param('id') id: string,
    @CurrentAccessToken() token: string,
  ) {
    return this.inventoryService.getIngredient(token, id);
  }

  @Roles('OWNER', 'STAFF')
  @Post('ingredients')
  createIngredient(
    @Body() dto: CreateIngredientDto,
    @CurrentUser() user: AuthenticatedUser,
    @CurrentAccessToken() token: string,
  ) {
    return this.inventoryService.createIngredient(token, user, dto);
  }

  @Roles('OWNER', 'STAFF')
  @Patch('ingredients/:id')
  updateIngredient(
    @Param('id') id: string,
    @Body() dto: UpdateIngredientDto,
    @CurrentUser() user: AuthenticatedUser,
    @CurrentAccessToken() token: string,
  ) {
    return this.inventoryService.updateIngredient(token, user, id, dto);
  }

  @Roles('OWNER', 'STAFF')
  @Delete('ingredients/:id')
  deleteIngredient(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
    @CurrentAccessToken() token: string,
  ) {
    return this.inventoryService.deleteIngredient(token, user, id);
  }

  /** ── RECIPES ── */

  @Roles('OWNER', 'STAFF')
  @Get('recipes/:productId')
  getProductRecipes(
    @Param('productId') productId: string,
    @CurrentAccessToken() token: string,
  ) {
    return this.inventoryService.getRecipes(token, productId);
  }

  @Roles('OWNER', 'STAFF')
  @Get('recipes')
  listRecipes(
    @Query('product_id') productId: string | undefined,
    @CurrentAccessToken() token: string,
  ) {
    return this.inventoryService.getRecipes(token, productId);
  }

  @Roles('OWNER', 'STAFF')
  @Post('recipes')
  createRecipe(
    @Body() dto: CreateRecipeDto,
    @CurrentUser() user: AuthenticatedUser,
    @CurrentAccessToken() token: string,
  ) {
    return this.inventoryService.createRecipe(token, user, dto);
  }

  @Roles('OWNER', 'STAFF')
  @Delete('recipes/:productId/ingredients/:ingredientId')
  deleteRecipe(
    @Param('productId') productId: string,
    @Param('ingredientId') ingredientId: string,
    @CurrentUser() user: AuthenticatedUser,
    @CurrentAccessToken() token: string,
  ) {
    return this.inventoryService.deleteRecipe(token, user, productId, ingredientId);
  }

  /** ── TRANSACTIONS ── */

  @Roles('OWNER', 'STAFF')
  @Post('transactions')
  createTransaction(
    @Body() dto: CreateTransactionDto,
    @CurrentUser() user: AuthenticatedUser,
    @CurrentAccessToken() token: string,
  ) {
    return this.inventoryService.createTransaction(token, user, dto);
  }

  @Roles('OWNER', 'STAFF')
  @Get('transactions')
  listTransactions(
    @Query() query: ListTransactionsQueryDto,
    @CurrentAccessToken() token: string,
  ) {
    return this.inventoryService.listTransactions(token, query);
  }
}
