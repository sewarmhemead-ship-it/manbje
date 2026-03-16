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
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { User } from '../users/entities/user.entity';
import { requireCompanyId } from '../common/company-id';
import { AuditService } from '../audit/audit.service';

@Controller('billing')
@UseGuards(JwtAuthGuard)
export class BillingController {
  constructor(
    private billingService: BillingService,
    private auditService: AuditService,
  ) {}

  @Post('invoices')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  async create(@CurrentUser() user: User, @Body() dto: CreateInvoiceDto) {
    const companyId = requireCompanyId(user);
    const invoice = await this.billingService.create(dto, companyId);
    await this.auditService.log({
      userId: user.id,
      companyId,
      action: 'create',
      entityType: 'invoice',
      entityId: invoice.id,
      details: { patientId: dto.patientId },
    });
    return invoice;
  }

  @Get('invoices')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  findAll(
    @CurrentUser() user: User,
    @Query('status') status?: InvoiceStatus,
    @Query('patientId') patientId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const companyId = requireCompanyId(user);
    return this.billingService.findAll({ companyId, status, patientId, startDate, endDate });
  }

  @Get('invoices/:id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  findOne(@CurrentUser() user: User, @Param('id', ParseUUIDPipe) id: string) {
    const companyId = requireCompanyId(user);
    return this.billingService.findOne(id, companyId);
  }

  @Patch('invoices/:id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  update(@CurrentUser() user: User, @Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateInvoiceDto) {
    const companyId = requireCompanyId(user);
    return this.billingService.update(id, dto, companyId);
  }

  @Delete('invoices/:id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  async remove(@CurrentUser() user: User, @Param('id', ParseUUIDPipe) id: string) {
    const companyId = requireCompanyId(user);
    await this.billingService.softDelete(id, companyId);
  }

  @Post('invoices/:id/items')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  addItem(
    @CurrentUser() user: User,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AddInvoiceItemDto,
  ) {
    const companyId = requireCompanyId(user);
    return this.billingService.addItem(id, dto, companyId);
  }

  @Delete('invoices/:id/items/:itemId')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  async removeItem(
    @CurrentUser() user: User,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('itemId', ParseUUIDPipe) itemId: string,
  ) {
    const companyId = requireCompanyId(user);
    await this.billingService.removeItem(id, itemId, companyId);
  }

  @Post('invoices/:id/payments')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  async addPayment(
    @CurrentUser() user: User,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreatePaymentDto,
  ) {
    const companyId = requireCompanyId(user);
    const payment = await this.billingService.addPayment(id, dto, companyId);
    await this.auditService.log({
      userId: user.id,
      companyId,
      action: 'add_payment',
      entityType: 'invoice',
      entityId: id,
      details: { amount: dto.amount, paymentId: payment.id },
    });
    return payment;
  }

  @Get('invoices/:id/payments')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  getPayments(@CurrentUser() user: User, @Param('id', ParseUUIDPipe) id: string) {
    const companyId = requireCompanyId(user);
    return this.billingService.getPayments(id, companyId);
  }

  @Get('stats')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  getStats(
    @CurrentUser() user: User,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const companyId = requireCompanyId(user);
    return this.billingService.getStats(companyId, startDate, endDate);
  }
}
