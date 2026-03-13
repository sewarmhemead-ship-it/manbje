import { DrugForm, DrugCategory } from '../entities/drug.entity';

export interface DrugSeedRow {
  nameAr: string;
  nameEn: string;
  defaultDose: number;
  doseUnit: string;
  form: DrugForm;
  category: DrugCategory;
  genericName?: string;
}

export const DRUGS_SEED: DrugSeedRow[] = [
  { nameAr: 'باراسيتامول', nameEn: 'Paracetamol', defaultDose: 500, doseUnit: 'mg', form: DrugForm.TABLET, category: DrugCategory.ANALGESIC },
  { nameAr: 'إيبوبروفين', nameEn: 'Ibuprofen', defaultDose: 400, doseUnit: 'mg', form: DrugForm.TABLET, category: DrugCategory.ANTI_INFLAMMATORY },
  { nameAr: 'ديكلوفيناك', nameEn: 'Diclofenac', defaultDose: 75, doseUnit: 'mg', form: DrugForm.INJECTION, category: DrugCategory.ANTI_INFLAMMATORY },
  { nameAr: 'نابروكسين', nameEn: 'Naproxen', defaultDose: 500, doseUnit: 'mg', form: DrugForm.TABLET, category: DrugCategory.ANTI_INFLAMMATORY },
  { nameAr: 'سيليكوكسيب', nameEn: 'Celecoxib', defaultDose: 200, doseUnit: 'mg', form: DrugForm.TABLET, category: DrugCategory.ANTI_INFLAMMATORY },
  { nameAr: 'ميثوكربامول', nameEn: 'Methocarbamol', defaultDose: 750, doseUnit: 'mg', form: DrugForm.TABLET, category: DrugCategory.MUSCLE_RELAXANT },
  { nameAr: 'سيكلوبنزابرين', nameEn: 'Cyclobenzaprine', defaultDose: 10, doseUnit: 'mg', form: DrugForm.TABLET, category: DrugCategory.MUSCLE_RELAXANT },
  { nameAr: 'تيزانيدين', nameEn: 'Tizanidine', defaultDose: 4, doseUnit: 'mg', form: DrugForm.TABLET, category: DrugCategory.MUSCLE_RELAXANT },
  { nameAr: 'باكلوفين', nameEn: 'Baclofen', defaultDose: 10, doseUnit: 'mg', form: DrugForm.TABLET, category: DrugCategory.MUSCLE_RELAXANT },
  { nameAr: 'بريدنيزولون', nameEn: 'Prednisolone', defaultDose: 5, doseUnit: 'mg', form: DrugForm.TABLET, category: DrugCategory.CORTICOSTEROID },
  { nameAr: 'ميثيل بريدنيزولون', nameEn: 'Methylprednisolone', defaultDose: 4, doseUnit: 'mg', form: DrugForm.TABLET, category: DrugCategory.CORTICOSTEROID },
  { nameAr: 'ديكساميثازون', nameEn: 'Dexamethasone', defaultDose: 8, doseUnit: 'mg', form: DrugForm.INJECTION, category: DrugCategory.CORTICOSTEROID },
  { nameAr: 'ديكلوفيناك جل', nameEn: 'Diclofenac Gel', defaultDose: 1, doseUnit: 'g', form: DrugForm.CREAM, category: DrugCategory.ANTI_INFLAMMATORY },
  { nameAr: 'كيتوبروفين جل', nameEn: 'Ketoprofen Gel', defaultDose: 1, doseUnit: 'g', form: DrugForm.CREAM, category: DrugCategory.ANTI_INFLAMMATORY },
  { nameAr: 'فولتارين إيمولجيل', nameEn: 'Voltaren Emulgel', defaultDose: 2, doseUnit: 'g', form: DrugForm.CREAM, category: DrugCategory.ANTI_INFLAMMATORY },
  { nameAr: 'هيالورونيك أسيد', nameEn: 'Hyaluronic Acid', defaultDose: 2, doseUnit: 'ml', form: DrugForm.INJECTION, category: DrugCategory.OTHER },
  { nameAr: 'تريامسينولون', nameEn: 'Triamcinolone', defaultDose: 40, doseUnit: 'mg', form: DrugForm.INJECTION, category: DrugCategory.CORTICOSTEROID },
  { nameAr: 'فيتامين د3', nameEn: 'Vitamin D3', defaultDose: 5000, doseUnit: 'IU', form: DrugForm.TABLET, category: DrugCategory.VITAMIN },
  { nameAr: 'كالسيوم + فيتامين د', nameEn: 'Calcium + Vit D', defaultDose: 500, doseUnit: 'mg', form: DrugForm.TABLET, category: DrugCategory.VITAMIN },
  { nameAr: 'ماغنيسيوم', nameEn: 'Magnesium', defaultDose: 400, doseUnit: 'mg', form: DrugForm.TABLET, category: DrugCategory.VITAMIN },
  { nameAr: 'فيتامين ب12', nameEn: 'Vitamin B12', defaultDose: 1000, doseUnit: 'mcg', form: DrugForm.INJECTION, category: DrugCategory.VITAMIN },
  { nameAr: 'أوميغا 3', nameEn: 'Omega-3', defaultDose: 1000, doseUnit: 'mg', form: DrugForm.TABLET, category: DrugCategory.VITAMIN },
  { nameAr: 'غابابنتين', nameEn: 'Gabapentin', defaultDose: 300, doseUnit: 'mg', form: DrugForm.TABLET, category: DrugCategory.ANALGESIC },
  { nameAr: 'بريغابالين', nameEn: 'Pregabalin', defaultDose: 75, doseUnit: 'mg', form: DrugForm.TABLET, category: DrugCategory.ANALGESIC },
  { nameAr: 'ترامادول', nameEn: 'Tramadol', defaultDose: 50, doseUnit: 'mg', form: DrugForm.TABLET, category: DrugCategory.ANALGESIC },
  { nameAr: 'أميتريبتيلين', nameEn: 'Amitriptyline', defaultDose: 10, doseUnit: 'mg', form: DrugForm.TABLET, category: DrugCategory.OTHER },
  { nameAr: 'ملح الإبسوم', nameEn: 'Epsom Salt Soak', defaultDose: 1, doseUnit: 'كوب', form: DrugForm.OTHER, category: DrugCategory.OTHER },
  { nameAr: 'كوديين', nameEn: 'Codeine', defaultDose: 30, doseUnit: 'mg', form: DrugForm.TABLET, category: DrugCategory.ANALGESIC },
  { nameAr: 'ميلوكسيكام', nameEn: 'Meloxicam', defaultDose: 15, doseUnit: 'mg', form: DrugForm.TABLET, category: DrugCategory.ANTI_INFLAMMATORY },
  { nameAr: 'بيروكسيكام', nameEn: 'Piroxicam', defaultDose: 20, doseUnit: 'mg', form: DrugForm.TABLET, category: DrugCategory.ANTI_INFLAMMATORY },
  { nameAr: 'كاريسوبرودول', nameEn: 'Carisoprodol', defaultDose: 350, doseUnit: 'mg', form: DrugForm.TABLET, category: DrugCategory.MUSCLE_RELAXANT },
  { nameAr: 'هيدروكورتيزون كريم', nameEn: 'Hydrocortisone Cream', defaultDose: 1, doseUnit: '%', form: DrugForm.CREAM, category: DrugCategory.CORTICOSTEROID },
  { nameAr: 'بيتاميثازون كريم', nameEn: 'Betamethasone Cream', defaultDose: 0.05, doseUnit: '%', form: DrugForm.CREAM, category: DrugCategory.CORTICOSTEROID },
  { nameAr: 'جلوكوزامين', nameEn: 'Glucosamine', defaultDose: 1500, doseUnit: 'mg', form: DrugForm.TABLET, category: DrugCategory.OTHER },
  { nameAr: 'كوندرويتين', nameEn: 'Chondroitin', defaultDose: 1200, doseUnit: 'mg', form: DrugForm.TABLET, category: DrugCategory.OTHER },
  { nameAr: 'دولوكسيتين', nameEn: 'Duloxetine', defaultDose: 60, doseUnit: 'mg', form: DrugForm.TABLET, category: DrugCategory.OTHER },
  { nameAr: 'نورتربتيلين', nameEn: 'Nortriptyline', defaultDose: 25, doseUnit: 'mg', form: DrugForm.TABLET, category: DrugCategory.OTHER },
  { nameAr: 'ليريكا', nameEn: 'Lyrica', defaultDose: 75, doseUnit: 'mg', form: DrugForm.TABLET, category: DrugCategory.ANALGESIC },
  { nameAr: 'فيتامين ب مركب', nameEn: 'B Complex', defaultDose: 1, doseUnit: 'tab', form: DrugForm.TABLET, category: DrugCategory.VITAMIN },
  { nameAr: 'حديد + حمض الفوليك', nameEn: 'Iron + Folic Acid', defaultDose: 100, doseUnit: 'mg', form: DrugForm.TABLET, category: DrugCategory.VITAMIN },
  { nameAr: 'زيلوكاين', nameEn: 'Xylocaine', defaultDose: 1, doseUnit: '%', form: DrugForm.INJECTION, category: DrugCategory.OTHER },
  { nameAr: 'كينالوج', nameEn: 'Kenalog', defaultDose: 40, doseUnit: 'mg', form: DrugForm.INJECTION, category: DrugCategory.CORTICOSTEROID },
  { nameAr: 'ديبوميدرول', nameEn: 'Dipomedrol', defaultDose: 25, doseUnit: 'mg', form: DrugForm.INJECTION, category: DrugCategory.OTHER },
  { nameAr: 'بانادول إكسترا', nameEn: 'Panadol Extra', defaultDose: 500, doseUnit: 'mg', form: DrugForm.TABLET, category: DrugCategory.ANALGESIC },
  { nameAr: 'بروفينيد', nameEn: 'Profenid', defaultDose: 150, doseUnit: 'mg', form: DrugForm.TABLET, category: DrugCategory.ANTI_INFLAMMATORY },
  { nameAr: 'فاستوم', nameEn: 'Fastum Gel', defaultDose: 2.5, doseUnit: 'g', form: DrugForm.CREAM, category: DrugCategory.ANTI_INFLAMMATORY },
  { nameAr: 'سوماتريبتان', nameEn: 'Sumatriptan', defaultDose: 50, doseUnit: 'mg', form: DrugForm.TABLET, category: DrugCategory.ANALGESIC },
  { nameAr: 'توبيرامات', nameEn: 'Topiramate', defaultDose: 50, doseUnit: 'mg', form: DrugForm.TABLET, category: DrugCategory.OTHER },
  { nameAr: 'كلونازيبام', nameEn: 'Clonazepam', defaultDose: 0.5, doseUnit: 'mg', form: DrugForm.TABLET, category: DrugCategory.MUSCLE_RELAXANT },
  { nameAr: 'ديازيبام', nameEn: 'Diazepam', defaultDose: 5, doseUnit: 'mg', form: DrugForm.TABLET, category: DrugCategory.MUSCLE_RELAXANT },
  { nameAr: 'كولشيسين', nameEn: 'Colchicine', defaultDose: 0.5, doseUnit: 'mg', form: DrugForm.TABLET, category: DrugCategory.OTHER },
  { nameAr: 'ألوبيورينول', nameEn: 'Allopurinol', defaultDose: 100, doseUnit: 'mg', form: DrugForm.TABLET, category: DrugCategory.OTHER },
  { nameAr: 'أسبرين', nameEn: 'Aspirin', defaultDose: 100, doseUnit: 'mg', form: DrugForm.TABLET, category: DrugCategory.ANALGESIC },
  { nameAr: 'نيميسوليد', nameEn: 'Nimesulide', defaultDose: 100, doseUnit: 'mg', form: DrugForm.TABLET, category: DrugCategory.ANTI_INFLAMMATORY },
];
