import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { Invoice, InvoiceStatus, PaymentMethodEnum } from './entities/invoice.entity';
import { InvoiceItem, ItemCategory } from './entities/invoice-item.entity';
import { Payment } from './entities/payment.entity';
import { CreateInvoiceDto } from './dto/create-invoice.dto';
import { UpdateInvoiceDto } from './dto/update-invoice.dto';
import { AddInvoiceItemDto } from './dto/add-invoice-item.dto';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { Patient } from '../patients/entities/patient.entity';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationType } from '../notifications/entities/notification.entity';

@Injectable()
export class BillingService {
  constructor(
    @InjectRepository(Invoice)
    private invoiceRepo: Repository<Invoice>,
    @InjectRepository(InvoiceItem)
    private itemRepo: Repository<InvoiceItem>,
    @InjectRepository(Payment)
    private paymentRepo: Repository<Payment>,
    @InjectRepository(Patient)
    private patientRepo: Repository<Patient>,
    private notificationsService: NotificationsService,
  ) {}

  private async nextInvoiceNumber(companyId?: string | null): Promise<string> {
    const today = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const prefix = `INV-${today}-`;
    const qb = this.invoiceRepo
      .createQueryBuilder('i')
      .where('i.invoice_number LIKE :prefix', { prefix: `${prefix}%` })
      .orderBy('i.invoice_number', 'DESC');
    if (companyId) qb.andWhere('i.company_id = :companyId', { companyId });
    const last = await qb.getOne();
    const next = last
      ? parseInt(last.invoiceNumber.slice(-3), 10) + 1
      : 1;
    return `${prefix}${String(next).padStart(3, '0')}`;
  }

  private recalcInvoice(invoice: Invoice, items: InvoiceItem[]): { subtotal: number; total: number } {
    const subtotal = items.reduce((s, i) => s + parseFloat(i.total), 0);
    const discount = parseFloat(invoice.discount);
    const tax = parseFloat(invoice.tax);
    const total = Math.max(0, subtotal - discount + tax);
    return { subtotal, total };
  }

  async create(dto: CreateInvoiceDto, companyId: string): Promise<Invoice> {
    const patient = await this.patientRepo.findOne({ where: { id: dto.patientId } });
    if (!patient) throw new NotFoundException('Patient not found');
    if (patient.companyId && companyId && patient.companyId !== companyId) {
      throw new NotFoundException('Patient not found');
    }

    const invoiceNumber = await this.nextInvoiceNumber(companyId);
    const dueDate = dto.dueDate ?? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    const discount = dto.discount ?? 0;
    const tax = dto.tax ?? 0;
    const insuranceCoverage = dto.insuranceCoverage ?? 0;

    const invoice = this.invoiceRepo.create({
      companyId,
      invoiceNumber,
      patientId: dto.patientId,
      appointmentId: dto.appointmentId ?? null,
      subtotal: '0',
      discount: String(discount),
      tax: String(tax),
      total: '0',
      insuranceProvider: dto.insuranceProvider ?? patient.insuranceCompany ?? null,
      insuranceCoverage: String(insuranceCoverage),
      patientDue: '0',
      status: dto.status ?? InvoiceStatus.DRAFT,
      paymentMethod: null,
      paidAmount: '0',
      paidAt: null,
      dueDate,
      notes: dto.notes ?? null,
    });
    return this.invoiceRepo.save(invoice);
  }

  async createForCompletedAppointment(companyId: string, params: {
    patientId: string;
    appointmentId: string;
    sessionAmount: number;
    hasTransport: boolean;
    transportAmount?: number;
    insuranceProvider?: string | null;
  }): Promise<Invoice> {
    const invoice = await this.create({
      patientId: params.patientId,
      appointmentId: params.appointmentId,
      dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
      status: InvoiceStatus.SENT,
      insuranceProvider: params.insuranceProvider ?? undefined,
    }, companyId);

    await this.addItem(invoice.id, {
      description: 'جلسة علاج طبيعي',
      quantity: 1,
      unitPrice: params.sessionAmount,
      category: ItemCategory.SESSION,
    });
    if (params.hasTransport && (params.transportAmount ?? 0) > 0) {
      await this.addItem(invoice.id, {
        description: 'خدمة نقل',
        quantity: 1,
        unitPrice: params.transportAmount ?? 0,
        category: ItemCategory.TRANSPORT,
      });
    }
    return this.findOne(invoice.id);
  }

  async findAll(filters?: { companyId?: string | null; status?: InvoiceStatus; patientId?: string; startDate?: string; endDate?: string }): Promise<Invoice[]> {
    const qb = this.invoiceRepo
      .createQueryBuilder('i')
      .leftJoinAndSelect('i.patient', 'p')
      .orderBy('i.created_at', 'DESC');

    if (filters?.companyId) qb.andWhere('i.company_id = :companyId', { companyId: filters.companyId });
    if (filters?.status) qb.andWhere('i.status = :status', { status: filters.status });
    if (filters?.patientId) qb.andWhere('i.patient_id = :patientId', { patientId: filters.patientId });
    if (filters?.startDate)
      qb.andWhere('i.created_at >= :start', { start: new Date(filters.startDate) });
    if (filters?.endDate) {
      const end = new Date(filters.endDate);
      end.setHours(23, 59, 59, 999);
      qb.andWhere('i.created_at <= :end', { end });
    }
    return qb.getMany();
  }

  async findOne(id: string, companyId?: string | null): Promise<Invoice> {
    const where: any = { id };
    if (companyId) where.companyId = companyId;
    const invoice = await this.invoiceRepo.findOne({
      where,
      relations: { patient: true, items: true, payments: true, appointment: true },
    });
    if (!invoice) throw new NotFoundException('Invoice not found');
    return invoice;
  }

  async update(id: string, dto: UpdateInvoiceDto, companyId?: string | null): Promise<Invoice> {
    const invoice = await this.findOne(id, companyId);
    if (dto.status !== undefined) invoice.status = dto.status;
    if (dto.discount !== undefined) invoice.discount = String(dto.discount);
    if (dto.notes !== undefined) invoice.notes = dto.notes;
    const items = await this.itemRepo.find({ where: { invoiceId: id } });
    const { subtotal, total } = this.recalcInvoice(invoice, items);
    invoice.subtotal = String(subtotal);
    invoice.total = String(total);
    const coverage = parseFloat(invoice.insuranceCoverage);
    invoice.patientDue = String(Math.max(0, total - coverage));
    return this.invoiceRepo.save(invoice);
  }

  async softDelete(id: string, companyId?: string | null): Promise<void> {
    const invoice = await this.findOne(id, companyId);
    invoice.status = InvoiceStatus.CANCELLED;
    await this.invoiceRepo.save(invoice);
  }

  async addItem(invoiceId: string, dto: AddInvoiceItemDto, companyId?: string | null): Promise<InvoiceItem> {
    const invoice = await this.findOne(invoiceId, companyId);
    const total = dto.quantity * dto.unitPrice;
    const item = this.itemRepo.create({
      invoiceId,
      description: dto.description,
      quantity: dto.quantity,
      unitPrice: String(dto.unitPrice),
      total: String(total),
      category: dto.category,
    });
    const saved = await this.itemRepo.save(item);
    const items = await this.itemRepo.find({ where: { invoiceId } });
    const { subtotal, total: grandTotal } = this.recalcInvoice(invoice, items);
    invoice.subtotal = String(subtotal);
    invoice.total = String(grandTotal);
    const coverage = parseFloat(invoice.insuranceCoverage);
    invoice.patientDue = String(Math.max(0, grandTotal - coverage));
    await this.invoiceRepo.save(invoice);
    return saved;
  }

  async removeItem(invoiceId: string, itemId: string, companyId?: string | null): Promise<void> {
    const invoice = await this.findOne(invoiceId, companyId);
    const item = await this.itemRepo.findOne({ where: { id: itemId, invoiceId } });
    if (!item) throw new NotFoundException('Invoice item not found');
    await this.itemRepo.remove(item);
    const items = await this.itemRepo.find({ where: { invoiceId } });
    const { subtotal, total } = this.recalcInvoice(invoice, items);
    invoice.subtotal = String(subtotal);
    invoice.total = String(total);
    const coverage = parseFloat(invoice.insuranceCoverage);
    invoice.patientDue = String(Math.max(0, total - coverage));
    await this.invoiceRepo.save(invoice);
  }

  async addPayment(invoiceId: string, dto: CreatePaymentDto, companyId?: string | null): Promise<Payment> {
    const invoice = await this.findOne(invoiceId, companyId);
    const payment = this.paymentRepo.create({
      invoiceId,
      amount: String(dto.amount),
      method: dto.method,
      referenceNumber: dto.referenceNumber ?? null,
      insuranceClaimNumber: dto.insuranceClaimNumber ?? null,
      notes: dto.notes ?? null,
    });
    const saved = await this.paymentRepo.save(payment);
    const payments = await this.paymentRepo.find({ where: { invoiceId } });
    const paidAmount = payments.reduce((s, p) => s + parseFloat(p.amount), 0);
    invoice.paidAmount = String(paidAmount);
    const total = parseFloat(invoice.total);
    if (paidAmount >= total) {
      invoice.status = InvoiceStatus.PAID;
      invoice.paidAt = new Date();
      invoice.paymentMethod = dto.method;
    } else {
      invoice.status = InvoiceStatus.PARTIALLY_PAID;
      invoice.paymentMethod = dto.method;
    }
    await this.invoiceRepo.save(invoice);

    try {
      const patient = await this.patientRepo.findOne({ where: { id: invoice.patientId }, select: ['userId'] });
      if (patient?.userId) {
        await this.notificationsService.createNotification(
          patient.userId,
          NotificationType.PAYMENT_RECEIVED,
          'استلام دفعة',
          `تم استلام دفعة بقيمة ${dto.amount}`,
          { invoiceId },
          invoice.companyId ?? undefined,
        );
      }
    } catch {
      // ignore
    }
    return saved;
  }

  async getPayments(invoiceId: string, companyId?: string | null): Promise<Payment[]> {
    await this.findOne(invoiceId, companyId);
    return this.paymentRepo.find({ where: { invoiceId }, order: { createdAt: 'DESC' } });
  }

  async getStats(companyId?: string | null, startDate?: string, endDate?: string): Promise<{
    totalRevenue: number;
    totalPaid: number;
    totalPending: number;
    insuranceCollected: number;
    byMethod: { method: string; amount: number }[];
  }> {
    const qb = this.invoiceRepo.createQueryBuilder('i').where('i.status != :cancelled', { cancelled: InvoiceStatus.CANCELLED });
    if (companyId) qb.andWhere('i.company_id = :companyId', { companyId });
    if (startDate) qb.andWhere('i.created_at >= :start', { start: new Date(startDate) });
    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      qb.andWhere('i.created_at <= :end', { end });
    }
    const invoices = await qb.getMany();
    let totalRevenue = 0;
    let totalPaid = 0;
    let insuranceCollected = 0;
    const byMethod: Record<string, number> = {};
    for (const inv of invoices) {
      totalRevenue += parseFloat(inv.total);
      totalPaid += parseFloat(inv.paidAmount);
      insuranceCollected += parseFloat(inv.insuranceCoverage);
      if (inv.paymentMethod) {
        byMethod[inv.paymentMethod] = (byMethod[inv.paymentMethod] ?? 0) + parseFloat(inv.paidAmount);
      }
    }
    const totalPending = totalRevenue - totalPaid;
    return {
      totalRevenue,
      totalPaid,
      totalPending,
      insuranceCollected,
      byMethod: Object.entries(byMethod).map(([method, amount]) => ({ method, amount })),
    };
  }

  async getRevenueForDateRange(startDate: string, endDate: string, companyId?: string | null): Promise<number> {
    const qb = this.invoiceRepo
      .createQueryBuilder('i')
      .select('COALESCE(SUM(i.total), 0)', 'sum')
      .where('i.status != :cancelled', { cancelled: InvoiceStatus.CANCELLED })
      .andWhere('i.created_at >= :start', { start: new Date(startDate) })
      .andWhere('i.created_at <= :end', { end: new Date(endDate) });
    if (companyId) qb.andWhere('i.company_id = :companyId', { companyId });
    const result = await qb.getRawOne<{ sum: string }>();
    return parseFloat(result?.sum ?? '0');
  }
}
