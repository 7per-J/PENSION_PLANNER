import { PensionIncome, FinancialAssets, SimConditions, SimYearResult, SimSummary } from "../types";

// 국민연금 기본 개시 나이 계산 (출생년도 기준 법정 연령)
export function getNationalBaseAge(birthYear: number): number {
  if (birthYear <= 1952) return 60;
  if (birthYear <= 1956) return 61;
  if (birthYear <= 1960) return 62;
  if (birthYear <= 1964) return 63;
  if (birthYear <= 1968) return 64;
  return 65; // 1969년생 이후
}

// Helper: Compute the smooth total target annual income T0 at startAge such that 
// adding fixed pensions and withdrawing from assets (T0*(1+I)^m - FixedPensions)
// amortizes the asset balance exactly to 0 at endAge.
function computeSmoothedTotalTargetIncome(
  startAge: number,
  endAge: number,
  startAssetsSum: number,
  weightedYieldRate: number,
  inflationRateVal: number,
  finalNationalStartAge: number,
  initialNationalAmount: number,
  privatePensions: SimConditions['privatePensions']
): number {
  const totalYears = Math.max(1, endAge - startAge + 1);
  if (startAssetsSum <= 0 && (!privatePensions || privatePensions.length === 0) && initialNationalAmount <= 0) {
    return 0;
  }

  const R = weightedYieldRate;
  const I = inflationRateVal / 100;

  // 1. Calculate annual fixed pensions (National + Private) for each year m = 0..totalYears-1
  const fixedPensions: number[] = [];
  let pvFixedPensions = 0;
  let d = 0;

  for (let m = 0; m < totalYears; m++) {
    const futureAge = startAge + m;

    // National Pension
    let nationalAnnual = 0;
    if (futureAge >= finalNationalStartAge) {
      const yearsOfPension = futureAge - finalNationalStartAge;
      nationalAnnual = initialNationalAmount * Math.pow(1 + I, yearsOfPension) * 12;
    }

    // Private Pension
    let privateAnnual = 0;
    if (privatePensions && privatePensions.length > 0) {
      for (const item of privatePensions) {
        if (!item.monthlyAmount || item.monthlyAmount <= 0) continue;
        let isActive = false;
        if (item.pensionType === 'whole') {
          isActive = futureAge >= item.startAge;
        } else {
          isActive = futureAge >= item.startAge && futureAge <= item.endAge;
        }
        if (isActive) {
          privateAnnual += item.monthlyAmount * 12;
        }
      }
    }

    const totalFixed = nationalAnnual + privateAnnual;
    fixedPensions.push(totalFixed);

    const discountFactor = Math.pow(1 + R, m);
    pvFixedPensions += totalFixed / discountFactor;
    d += Math.pow(1 + I, m) / discountFactor;
  }

  if (d <= 0) return 0;
  if (startAssetsSum <= 0) {
    return fixedPensions[0] || 0;
  }

  // Evaluate required PV of asset withdrawals for a candidate T0
  const evalPV = (candidateT0: number) => {
    let pvWithdrawals = 0;
    for (let m = 0; m < totalYears; m++) {
      const targetIncome_m = candidateT0 * Math.pow(1 + I, m);
      const withdrawal_m = Math.max(0, targetIncome_m - fixedPensions[m]);
      pvWithdrawals += withdrawal_m / Math.pow(1 + R, m);
    }
    return pvWithdrawals;
  };

  // Binary search for exact T0 where evalPV(T0) == startAssetsSum
  let low = 0;
  let high = (startAssetsSum + pvFixedPensions) / Math.min(1, d) * 5 + 1e8;

  for (let iter = 0; iter < 50; iter++) {
    const mid = (low + high) / 2;
    const pv = evalPV(mid);
    if (pv < startAssetsSum) {
      low = mid;
    } else {
      high = mid;
    }
  }

  return high;
}

export function runPensionSimulation(
  pensionIncome: PensionIncome,
  financialAssets: FinancialAssets,
  conditions: SimConditions
): { results: SimYearResult[]; summary: SimSummary } {
  const BASE_YEAR = 2026;
  const birthYear = conditions.birthYear > 0 ? conditions.birthYear : 1970;
  const currentAge = BASE_YEAR - birthYear;
  const expectedLifespan = conditions.expectedLifespan > 0 ? conditions.expectedLifespan : 90;

  // 1. 국민연금 개시 나이 및 감액/증액 비율 산정
  const nationalBaseAge = getNationalBaseAge(birthYear);
  const finalNationalStartAge = nationalBaseAge + pensionIncome.nationalTiming;
  
  // 조기 수령 1년당 -6% (최대 -30%), 연기 수령 1년당 +7.2% (최대 +36%)
  let nationalRatio = 1.0;
  if (pensionIncome.nationalTiming < 0) {
    nationalRatio += pensionIncome.nationalTiming * 0.06;
  } else if (pensionIncome.nationalTiming > 0) {
    nationalRatio += pensionIncome.nationalTiming * 0.072;
  }
  const initialNationalAmount = pensionIncome.nationalAmount * nationalRatio;

  // 2. 금융 자산 복제 (원금과 수익금 분리 관리)
  interface AssetTrack {
    type: keyof FinancialAssets | string;
    principal: number;
    yieldAccum: number;
    yieldRate: number;
  }

  const assets: AssetTrack[] = [
    { type: 'cash', principal: financialAssets.cash, yieldAccum: 0, yieldRate: financialAssets.cashYield / 100 },
    { type: 'general', principal: financialAssets.general, yieldAccum: 0, yieldRate: financialAssets.generalYield / 100 },
    { type: 'isa', principal: financialAssets.isa, yieldAccum: 0, yieldRate: financialAssets.isaYield / 100 },
    { type: 'dc', principal: financialAssets.dc, yieldAccum: 0, yieldRate: financialAssets.dcYield / 100 },
    { type: 'pensionSav', principal: financialAssets.pensionSav || 0, yieldAccum: 0, yieldRate: (financialAssets.pensionSavYield || 5.0) / 100 },
    { type: 'irp', principal: financialAssets.irp, yieldAccum: 0, yieldRate: financialAssets.irpYield / 100 },
  ];

  const initialTotalAssets = assets.reduce((sum, a) => sum + a.principal, 0);

  // 3. 세율 구하기
  let taxRate = 0;
  if (conditions.taxRateType === 'pension') taxRate = 0.055;
  else if (conditions.taxRateType === 'income') taxRate = 0.154;
  else if (conditions.taxRateType === 'custom') taxRate = conditions.customTaxRate / 100;

  const results: SimYearResult[] = [];
  let exhaustionAge: number | null = null;
  let exhaustionYear: number | null = null;

  let baseIncludeTotalT0: number | null = null;
  let baseOptimalTotalT0: number | null = null;

  let maxSimAge = expectedLifespan > 0 ? expectedLifespan : 90;

  if (conditions.withdrawType === 'include') {
    maxSimAge = conditions.withdrawEndAge > 0 ? conditions.withdrawEndAge : (expectedLifespan > 0 ? expectedLifespan : 90);
  } else if (conditions.withdrawType === 'maintain') {
    maxSimAge = expectedLifespan > 0 ? expectedLifespan : 90;
  } else if (conditions.withdrawType === 'custom') {
    maxSimAge = expectedLifespan > 0 ? expectedLifespan : 90;
  } else if (conditions.withdrawType === 'optimal') {
    maxSimAge = conditions.optimalEndAge > 0 ? conditions.optimalEndAge : (expectedLifespan > 0 ? expectedLifespan : 90);
  }

  maxSimAge = Math.max(currentAge, maxSimAge);

  for (let age = currentAge; age <= maxSimAge; age++) {
    const year = BASE_YEAR + (age - currentAge);

    // A. 당해 연도 연금소득 계산
    // 1) 국민연금 (매년 물가상승률만큼 인상 적용)
    let nationalPensionMonthly = 0;
    if (age >= finalNationalStartAge) {
      const yearsOfPension = age - finalNationalStartAge;
      nationalPensionMonthly = initialNationalAmount * Math.pow(1 + (conditions.inflationRate / 100), yearsOfPension);
    }
    const annualNational = Math.round(nationalPensionMonthly * 12);

    // 2) 사적연금 / 종신연금 합산 (물가상승률 미적용, 고정 명목 금액)
    let privatePensionMonthlyTotal = 0;
    if (conditions.privatePensions && conditions.privatePensions.length > 0) {
      for (const item of conditions.privatePensions) {
        if (!item.monthlyAmount || item.monthlyAmount <= 0) continue;
        let isActive = false;
        if (item.pensionType === 'whole') {
          isActive = age >= item.startAge;
        } else {
          isActive = age >= item.startAge && age <= item.endAge;
        }

        if (isActive) {
          privatePensionMonthlyTotal += item.monthlyAmount;
        }
      }
    }
    const annualPrivatePension = Math.round(privatePensionMonthlyTotal * 12);

    // 확정 연금 수령 총액 (국민연금 + 사적연금)
    const annualTotalFixedPensions = annualNational + annualPrivatePension;

    // B. 자산 평가수익 가산 (연초 시점 자산에 자산별 수익률 반영)
    const startAssetsSum = assets.reduce((sum, a) => sum + (a.principal + a.yieldAccum), 0);
    
    let totalEarnedYieldThisYear = 0;
    const earnedYieldMap = new Map<string, number>();
    assets.forEach(a => {
      const currentBalance = a.principal + a.yieldAccum;
      const earned = currentBalance * a.yieldRate;
      earnedYieldMap.set(a.type, earned);
      totalEarnedYieldThisYear += earned;
    });

    const afterYieldAssetsSum = startAssetsSum + totalEarnedYieldThisYear;

    // C. 당해 연도 자산 인출액 산정
    let targetAnnualWithdraw = 0;

    if (conditions.withdrawType === 'maintain') {
      // [원금 유지]: 자산 인출 시작 시점 이후 연간 발생한 수익금만큼만 인출하여 원금을 100% 보존
      const startAge = conditions.withdrawalStartAge > 0 ? conditions.withdrawalStartAge : currentAge;
      if (age >= startAge) {
        targetAnnualWithdraw = Math.max(0, totalEarnedYieldThisYear);
      }
    } 
    else if (conditions.withdrawType === 'include') {
      // [원금 포함]: 수급 개시 나이부터 희망 종료 나이(maxSimAge)까지 총 수령액이 매년 물가상승률대로 매끄럽게 완탄 인출되도록 평탄화
      const startAge = conditions.withdrawalStartAge > 0 ? conditions.withdrawalStartAge : currentAge;
      const endAge = maxSimAge;
      if (age >= startAge && age <= endAge) {
        if (baseIncludeTotalT0 === null && afterYieldAssetsSum >= 0) {
          const weightedYield = afterYieldAssetsSum > 0 ? assets.reduce((sum, a) => sum + ((a.principal + a.yieldAccum) * a.yieldRate), 0) / afterYieldAssetsSum : 0;
          baseIncludeTotalT0 = computeSmoothedTotalTargetIncome(
            startAge,
            endAge,
            afterYieldAssetsSum,
            weightedYield,
            conditions.inflationRate,
            finalNationalStartAge,
            initialNationalAmount,
            conditions.privatePensions
          );
        }
        const yearsInWithdrawal = age - startAge;
        const currentTargetTotalAnnual = (baseIncludeTotalT0 || 0) * Math.pow(1 + (conditions.inflationRate / 100), yearsInWithdrawal);
        const requiredAssetWithdrawal = Math.max(0, currentTargetTotalAnnual - annualTotalFixedPensions);
        targetAnnualWithdraw = Math.min(afterYieldAssetsSum, requiredAssetWithdrawal);
      } else {
        targetAnnualWithdraw = 0;
      }
    } 
    else if (conditions.withdrawType === 'custom') {
      // [정액 수령 / 맞춤 수령]: 기대수명(maxSimAge)까지 전체 수령액 평탄화 인출
      const startAge = conditions.withdrawalStartAge > 0 ? conditions.withdrawalStartAge : currentAge;
      const endAge = maxSimAge;
      if (age >= startAge && age <= endAge) {
        if (baseIncludeTotalT0 === null && afterYieldAssetsSum >= 0) {
          const weightedYield = afterYieldAssetsSum > 0 ? assets.reduce((sum, a) => sum + ((a.principal + a.yieldAccum) * a.yieldRate), 0) / afterYieldAssetsSum : 0;
          baseIncludeTotalT0 = computeSmoothedTotalTargetIncome(
            startAge,
            endAge,
            afterYieldAssetsSum,
            weightedYield,
            conditions.inflationRate,
            finalNationalStartAge,
            initialNationalAmount,
            conditions.privatePensions
          );
        }
        const yearsInWithdrawal = age - startAge;
        const currentTargetTotalAnnual = (baseIncludeTotalT0 || 0) * Math.pow(1 + (conditions.inflationRate / 100), yearsInWithdrawal);
        const requiredAssetWithdrawal = Math.max(0, currentTargetTotalAnnual - annualTotalFixedPensions);
        targetAnnualWithdraw = Math.min(afterYieldAssetsSum, requiredAssetWithdrawal);
      } else {
        targetAnnualWithdraw = 0;
      }
    }
    else if (conditions.withdrawType === 'optimal') {
      // [최적 연금]: 최적 지정 기간 (optimalStartAge ~ maxSimAge) 동안 전체 수령액 평탄화 인출
      const startAge = conditions.optimalStartAge > 0 ? conditions.optimalStartAge : (conditions.withdrawalStartAge > 0 ? conditions.withdrawalStartAge : currentAge);
      const endAge = maxSimAge;

      if (age >= startAge && age <= endAge) {
        if (baseOptimalTotalT0 === null && afterYieldAssetsSum >= 0) {
          const weightedYield = afterYieldAssetsSum > 0 ? assets.reduce((sum, a) => sum + ((a.principal + a.yieldAccum) * a.yieldRate), 0) / afterYieldAssetsSum : 0;
          baseOptimalTotalT0 = computeSmoothedTotalTargetIncome(
            startAge,
            endAge,
            afterYieldAssetsSum,
            weightedYield,
            conditions.inflationRate,
            finalNationalStartAge,
            initialNationalAmount,
            conditions.privatePensions
          );
        }
        const yearsInWithdrawal = age - startAge;
        const currentTargetTotalAnnual = (baseOptimalTotalT0 || 0) * Math.pow(1 + (conditions.inflationRate / 100), yearsInWithdrawal);
        const requiredAssetWithdrawal = Math.max(0, currentTargetTotalAnnual - annualTotalFixedPensions);
        targetAnnualWithdraw = Math.min(afterYieldAssetsSum, requiredAssetWithdrawal);
      } else {
        targetAnnualWithdraw = 0;
      }
    }

    // D. 자산에서 비례 인출 (포트폴리오 수익률 고정 및 정교한 자산 소진)
    let actualAnnualWithdraw = Math.min(afterYieldAssetsSum, targetAnnualWithdraw);

    if (afterYieldAssetsSum > 0 && actualAnnualWithdraw > 0) {
      const withdrawRatio = actualAnnualWithdraw / afterYieldAssetsSum;

      assets.forEach(a => {
        const earned = earnedYieldMap.get(a.type) || 0;
        const balAfterYield = a.principal + a.yieldAccum + earned;
        const aDeduct = balAfterYield * withdrawRatio;
        const newBal = Math.max(0, balAfterYield - aDeduct);

        if (balAfterYield > 0) {
          const pRatio = a.principal / (a.principal + a.yieldAccum);
          a.principal = newBal * pRatio;
          a.yieldAccum = newBal * (1 - pRatio);
        } else {
          a.principal = 0;
          a.yieldAccum = 0;
        }
      });
    } else {
      // 인출이 없는 경우 당해 발생 수익금 전액 가산
      assets.forEach(a => {
        const earned = earnedYieldMap.get(a.type) || 0;
        a.yieldAccum += earned;
      });
    }

    // 연말 기준 최종 원금/수익금 잔액 합산
    let endPrincipal = assets.reduce((sum, a) => sum + a.principal, 0);
    let endYield = assets.reduce((sum, a) => sum + a.yieldAccum, 0);
    let endBalance = endPrincipal + endYield;

    if (endBalance < 1) {
      endBalance = 0;
      endPrincipal = 0;
      endYield = 0;
    }

    // E. 세후 연금액 및 월 수급액 계산
    // 사적연금/종신연금은 비과세(소득세 미적용), 국민연금 및 금융자산 인출액에만 선택된 세율 적용
    const taxableAnnualIncome = annualNational + targetAnnualWithdraw;
    const taxableAnnualIncomeAfterTax = taxableAnnualIncome * (1 - taxRate);
    const annualTotalIncomeTaxed = Math.round(taxableAnnualIncomeAfterTax + annualPrivatePension);

    const annualTotalIncomePreTax = annualTotalFixedPensions + targetAnnualWithdraw;
    const monthlyPreTax = Math.round(annualTotalIncomePreTax / 12);
    const monthlyTaxed = Math.round(annualTotalIncomeTaxed / 12);

    // F. 자산 고갈 감지 (자산이 0에 가깝고 고갈 시점이 기록되지 않았을 때)
    if (endBalance <= 100 && exhaustionAge === null && initialTotalAssets > 0) {
      if (conditions.withdrawType !== 'maintain') {
        exhaustionAge = age;
        exhaustionYear = year;
      }
    }

    results.push({
      year,
      age,
      monthlyPreTax,
      monthlyTaxed,
      annualTotal: annualTotalIncomeTaxed,
      balance: Math.round(endBalance),
      principalBalance: Math.round(endPrincipal),
      yieldBalance: Math.round(endYield),
      nationalPension: Math.round(nationalPensionMonthly),
      privatePension: Math.round(privatePensionMonthlyTotal),
      assetWithdrawal: Math.round(targetAnnualWithdraw / 12),
      annualYieldEarned: Math.round(totalEarnedYieldThisYear)
    });
  }

  // 4. 은퇴 첫해 세후 월 수령액 구하기
  const firstYearMonthly = results[0]?.monthlyTaxed || 0;

  return {
    results,
    summary: {
      totalAssets: initialTotalAssets,
      firstYearMonthly,
      exhaustionAge,
      exhaustionYear
    }
  };
}
