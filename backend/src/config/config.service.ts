import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCityDto } from './dto/create-city.dto';
import { UpdateCityDto } from './dto/update-city.dto';
import { CreateExtraProductDto } from './dto/create-extra-product.dto';
import { UpdateExtraProductDto } from './dto/update-extra-product.dto';

@Injectable()
export class ConfigService {
  constructor(private prisma: PrismaService) {}

  // Cidades
  async getCities() {
    return this.prisma.cityConfig.findMany({
      orderBy: { name: 'asc' },
    });
  }

  async getActiveCities() {
    return this.prisma.cityConfig.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
    });
  }

  async createCity(dto: CreateCityDto) {
    return this.prisma.cityConfig.create({
      data: {
        name: dto.name,
        state: dto.state || 'RS',
        baseDeslocamento: dto.baseDeslocamento,
      },
    });
  }

  async updateCity(id: string, dto: UpdateCityDto) {
    const city = await this.prisma.cityConfig.findUnique({
      where: { id },
    });

    if (!city) {
      throw new NotFoundException('Cidade não encontrada');
    }

    return this.prisma.cityConfig.update({
      where: { id },
      data: {
        name: dto.name,
        state: dto.state,
        baseDeslocamento: dto.baseDeslocamento,
        isActive: dto.isActive,
      },
    });
  }

  async deleteCity(id: string) {
    return this.prisma.cityConfig.delete({
      where: { id },
    });
  }

  // Produtos Extras
  async getExtraProducts() {
    return this.prisma.extraProduct.findMany({
      orderBy: { sortOrder: 'asc' },
    });
  }

  async getActiveExtraProducts() {
    return this.prisma.extraProduct.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' },
    });
  }

  async createExtraProduct(dto: CreateExtraProductDto) {
    return this.prisma.extraProduct.create({
      data: {
        name: dto.name,
        description: dto.description,
        price: dto.price,
        icon: dto.icon,
        sortOrder: dto.sortOrder || 0,
      },
    });
  }

  async updateExtraProduct(id: string, dto: UpdateExtraProductDto) {
    const product = await this.prisma.extraProduct.findUnique({
      where: { id },
    });

    if (!product) {
      throw new NotFoundException('Produto não encontrado');
    }

    return this.prisma.extraProduct.update({
      where: { id },
      data: {
        name: dto.name,
        description: dto.description,
        price: dto.price,
        icon: dto.icon,
        sortOrder: dto.sortOrder,
        isActive: dto.isActive,
      },
    });
  }

  async deleteExtraProduct(id: string) {
    return this.prisma.extraProduct.delete({
      where: { id },
    });
  }

  // Configurações de Preço
  async getPricingConfigs() {
    return this.prisma.pricingConfig.findMany();
  }

  async updatePricingConfig(key: string, value: number) {
    return this.prisma.pricingConfig.update({
      where: { key },
      data: { value },
    });
  }
}