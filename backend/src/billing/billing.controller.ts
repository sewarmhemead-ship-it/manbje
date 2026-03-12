import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import { BillingService } from './billing.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '../users/entities/user.entity';
import { CreateInvoiceDto } from './dto/create-invoice.dto';
import { UpdateInvoiceDto } from './dto/update-invoice.dto';
import { AddInvoiceItemDto } from './dto/add-invoice-item.dto';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { InvoiceStatus } from './entities/invoice.entity';

@Controller('billing')
@UseGuards(JwtAuthGuard)
export class BillingController {
  constructor(private billingService: BillingService) {}

  @Post('invoices')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  create(@Body() dto: CreateInvoiceDto) {
    return this.billingService.create(dto);
  }

  @Get('invoices')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  findAll(
    @Query('status') status?: InvoiceStatus,
    @Query('patientId') patientId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.billingService.findAll({ status, patientId, startDate, endDate });
  }

  @Get('invoices/:id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.billingService.findOne(id);
  }

  @Patch('invoices/:id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateInvoiceDto) {
    return this.billingService.update(id, dto);
  }

  @Delete('invoices/:id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  async remove(@Param('id', ParseUUIDPipe) id: string) {
    await this.billingService.softDelete(id);
  }

  @Post('invoices/:id/items')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  addItem(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AddInvoiceItemDto,
  ) {
    return this.billingService.addItem(id, dto);
  }

  @Delete('invoices/:id/items/:itemId')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  async removeItem(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('itemId', ParseUUIDPipe) itemId: string,
  ) {
    await this.billingService.removeItem(id, itemId);
  }

  @Post('invoices/:id/payments')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  addPayment(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreatePaymentDto,
  ) {
    return this.billingService.addPayment(id, dto);
  }

  @Get('invoices/:id/payments')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  getPayments(@Param('id', ParseUUIDPipe) id: string) {
    return this.billingService.getPayments(id);
  }

  @Get('stats')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  getStats(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.billingService.getStats(startDate, endDate);
  }
}
