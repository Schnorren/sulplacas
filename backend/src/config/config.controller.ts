import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { ConfigService } from './config.service';
import { CreateCityDto } from './dto/create-city.dto';
import { UpdateCityDto } from './dto/update-city.dto';
import { CreateExtraProductDto } from './dto/create-extra-product.dto';
import { UpdateExtraProductDto } from './dto/update-extra-product.dto';

@Controller('config')
export class ConfigController {
  constructor(private readonly configService: ConfigService) {}

  // Cidades
  @Get('cities')
  async getCities() {
    return this.configService.getCities();
  }

  @Get('cities/active')
  async getActiveCities() {
    return this.configService.getActiveCities();
  }

  @Post('cities')
  async createCity(@Body() dto: CreateCityDto) {
    return this.configService.createCity(dto);
  }

  @Put('cities/:id')
  async updateCity(@Param('id') id: string, @Body() dto: UpdateCityDto) {
    return this.configService.updateCity(id, dto);
  }

  @Delete('cities/:id')
  async deleteCity(@Param('id') id: string) {
    return this.configService.deleteCity(id);
  }

  // Produtos Extras
  @Get('extra-products')
  async getExtraProducts() {
    return this.configService.getExtraProducts();
  }

  @Get('extra-products/active')
  async getActiveExtraProducts() {
    return this.configService.getActiveExtraProducts();
  }

  @Post('extra-products')
  async createExtraProduct(@Body() dto: CreateExtraProductDto) {
    return this.configService.createExtraProduct(dto);
  }

  @Put('extra-products/:id')
  async updateExtraProduct(
    @Param('id') id: string,
    @Body() dto: UpdateExtraProductDto,
  ) {
    return this.configService.updateExtraProduct(id, dto);
  }

  @Delete('extra-products/:id')
  async deleteExtraProduct(@Param('id') id: string) {
    return this.configService.deleteExtraProduct(id);
  }

  // Configurações de Preço
  @Get('pricing')
  async getPricingConfigs() {
    return this.configService.getPricingConfigs();
  }

  @Put('pricing/:key')
  async updatePricingConfig(
    @Param('key') key: string,
    @Body('value') value: number,
  ) {
    return this.configService.updatePricingConfig(key, value);
  }
}