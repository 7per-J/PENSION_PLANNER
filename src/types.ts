export interface PrivatePensionItem {
  id: string;
  name: string;              // 보험/연금 명칭 (예: 종신연금 1)
  monthlyAmount: number;     // 월 수령액 (원, 현재가치)
  pensionType: 'whole' | 'period'; // '종신' vs '기간 지정'
  startAge: number;          // 수령 시작 나이
  endAge: number;            // 수령 종료 나이 ('기간 지정' 시)
}

export interface PensionIncome {
  nationalAmount: number;     // 예상 월 수령액 (원)
  nationalStartAge: number;   // 기본 수령 시작 나이 (만)
  nationalTiming: number;     // 조기/연기 수령 선택 (-5 ~ +5)
}

export interface FinancialAssets {
  irp: number;                // IRP 현재 평가금액
  irpYield: number;           // IRP 예상 수익률
  pensionSav: number;         // 연금저축계좌 평가금액
  pensionSavYield: number;    // 연금저축계좌 예상 수익률
  dc: number;                 // 퇴직연금 DC 잔액
  dcYield: number;            // DC 예상 수익률
  isa: number;                // ISA 잔액
  isaYield: number;           // ISA 예상 수익률
  general: number;            // 일반 주식/예적금 잔액
  generalYield: number;       // 일반 주식/예적금 예상 수익률
  cash: number;               // 현금/CMA 잔액
  cashYield: number;          // 현금/CMA 예상 수익률
}

export interface SimConditions {
  birthYear: number;
  expectedLifespan: number;
  inflationRate: number;
  withdrawType: 'include' | 'maintain' | 'custom' | 'optimal'; // 인출 방식 (원금포함, 원금유지, 정액수령, 최적연금)
  includeCriteria: 'age' | 'amount';               // 원금포함 하위 기준 (나이 기준, 수급액 기준)
  withdrawEndAge: number;                           // 희망종료나이
  includeMonthlyAmount: number;                     // 희망 월 수급액
  customMonthlyAmount: number;                      // 생활비 총 월 수급액 (세전, 국민연금/사적연금 포함)
  optimalStartAge: number;                         // 최적연금 시작 나이
  optimalEndAge: number;                           // 최적연금 종료 나이
  taxRateType: 'none' | 'pension' | 'income' | 'custom';
  customTaxRate: number;                            // 직접입력 세율 (%)
  withdrawalStartAge: number;                       // 연금 개시 나이 (자산 인출 시작 나이)
  privatePensions: PrivatePensionItem[];            // 종신연금/사적연금 목록 (최대 5개)
}

export interface SimYearResult {
  year: number;
  age: number;
  monthlyPreTax: number;
  monthlyTaxed: number;
  annualTotal: number;
  balance: number;
  principalBalance: number;
  yieldBalance: number;
  nationalPension: number;     // 국민연금 월 수령액
  privatePension: number;      // 사적연금/종신연금 월 수령액
  assetWithdrawal: number;     // 금융자산 인출 월 수령액
  annualYieldEarned: number;  // 예상 연수익금 (당해 발생)
}

export interface SimSummary {
  totalAssets: number;
  firstYearMonthly: number;
  exhaustionAge: number | null;
  exhaustionYear: number | null;
}
