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

// Helper: Calculate smooth asset withdrawal considering future fixed pensions (National + Private)
function computeSmoothedAnnualWithdraw(
  currentAge: number,
  endAge: number,
  currentAssetsSum: number,
  weightedYieldRate: number,
  inflationRateVal: number,
  finalNationalStartAge: number,
  initialNationalAmount: number,
  privatePensions: SimConditions['privatePensions'],
  currentAnnualFixedPension: number
): number {
  const remainingYears = Math.max(1, endAge - currentAge + 1);
  if (currentAssetsSum <= 0) return 0;

  const R = weightedYieldRate;
  const I = inflationRateVal / 100;

  // 1) Present Value of all future fixed pensions (National + Private) over remainingYears
  let pvFixedPensions = 0;
  for (let m = 0; m < remainingYears; m++) {
    const futureAge = currentAge + m;

    // Future National Pension
    let futureNationalMonthly = 0;
    if (futureAge >= finalNationalStartAge) {
      const yearsOfPension = futureAge - finalNationalStartAge;
      futureNationalMonthly = initialNationalAmount * Math.pow(1 + I, yearsOfPension);
    }
    const futureNationalAnnual = futureNationalMonthly * 12;

    // Future Private Pension (Fixed nominal amount without inflation factor)
    let futurePrivateMonthly = 0;
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
          futurePrivateMonthly += item.monthlyAmount;
        }
      }
    }
    const futurePrivateAnnual = futurePrivateMonthly * 12;
    const futureFixedAnnual = futureNationalAnnual + futurePrivateAnnual;

    // Discount back to current year (m=0 is current year)
    pvFixedPensions += futureFixedAnnual / Math.pow(1 + R, m);
  }

  // 2) Discount sum d for smooth inflated target income
  let d = 0;
  for (let m = 0; m < remainingYears; m++) {
    d += Math.pow(1 + I, m) / Math.pow(1 + R, m);
  }

  if (d <= 0) return 0;

  // 3) Smooth target total annual income for current year
  const targetTotalAnnual = (currentAssetsSum + pvFixedPensions) / d;

  // 4) Financial asset withdrawal required = Target Total - Current Fixed Pension
  const requiredWithdraw = targetTotalAnnual - currentAnnualFixedPension;

  // Bounded between 0 and currentAssetsSum
  return Math.max(0, Math.min(currentAssetsSum, requiredWithdraw));
}

export function runPensionSimulation(
  pensionIncome: PensionIncome,
  financialAssets: FinancialAssets,
  conditions: SimConditions
): { results: SimYearResult[]; summary: SimSummary } {
  const BASE_YEAR = 2026;
  const currentAge = BASE_YEAR - conditions.birthYear;
  const expectedLifespan = conditions.expectedLifespan;

  // 1. 국민연금 개시 나이 및 감액/증액 비율 산정
  const nationalBaseAge = getNationalBaseAge(conditions.birthYear);
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

  // 시뮬레이션은 현재 나이부터 기대수명 또는 100세까지 진행
  const maxSimAge = Math.max(currentAge, expectedLifespan, 100);

  for (let age = currentAge; age <= maxSimAge; age++) {
    const year = BASE_YEAR + (age - currentAge);
    const yearsSinceStart = age - currentAge;

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
      // [원금 유지]: 자산 인출 시작 시점 이후 연간 발생한 수익금만큼만 인출
      if (age >= (conditions.withdrawalStartAge || currentAge)) {
        targetAnnualWithdraw = Math.max(0, totalEarnedYieldThisYear);
      }
    } 
    else if (conditions.withdrawType === 'include') {
      // [원금 포함]
      if (age >= (conditions.withdrawalStartAge || currentAge)) {
        if (conditions.includeCriteria === 'age') {
          // 1) 희망 종료 나이 기준 분할 인출 (사적연금/국민연금 포함 평탄화 인출)
          if (age <= conditions.withdrawEndAge && afterYieldAssetsSum > 0) {
            let weightedYield = 0;
            if (afterYieldAssetsSum > 0) {
              weightedYield = assets.reduce((sum, a) => sum + ((a.principal + a.yieldAccum) * a.yieldRate), 0) / afterYieldAssetsSum;
            }

            targetAnnualWithdraw = computeSmoothedAnnualWithdraw(
              age,
              conditions.withdrawEndAge,
              afterYieldAssetsSum,
              weightedYield,
              conditions.inflationRate,
              finalNationalStartAge,
              initialNationalAmount,
              conditions.privatePensions,
              annualTotalFixedPensions
            );
          } else {
            targetAnnualWithdraw = 0;
          }
        } else {
          // 2) 희망 월 수급액 기준 소진 인출 (고정 연금액 차감 후 부족분 인출)
          const adjustedMonthly = conditions.includeMonthlyAmount * Math.pow(1 + (conditions.inflationRate / 100), yearsSinceStart);
          const targetAnnualTotal = adjustedMonthly * 12;
          targetAnnualWithdraw = Math.max(0, Math.min(afterYieldAssetsSum, targetAnnualTotal - annualTotalFixedPensions));
        }
      }
    } 
    else if (conditions.withdrawType === 'custom') {
      // [정액 수령]: 원하는 총 생활비(물가 반영)에서 연금수령액(국민연금+사적연금)을 차감한 부족분만큼 자산에서 인출
      if (age >= (conditions.withdrawalStartAge || currentAge)) {
        const adjustedTotalMonthly = conditions.customMonthlyAmount * Math.pow(1 + (conditions.inflationRate / 100), yearsSinceStart);
        const targetAnnualTotal = adjustedTotalMonthly * 12;
        targetAnnualWithdraw = Math.max(0, Math.min(afterYieldAssetsSum, targetAnnualTotal - annualTotalFixedPensions));
      }
    }
    else if (conditions.withdrawType === 'optimal') {
      // [최적 연금]: 최적 연금 지정 기간 (optimalStartAge ~ optimalEndAge) 동안 고정연금을 차감하여 완탄화 소진
      const startAge = conditions.optimalStartAge || conditions.withdrawalStartAge || currentAge;
      const endAge = conditions.optimalEndAge || expectedLifespan;

      if (age >= startAge && age <= endAge) {
        if (afterYieldAssetsSum > 0) {
          let weightedYield = 0;
          weightedYield = assets.reduce((sum, a) => sum + ((a.principal + a.yieldAccum) * a.yieldRate), 0) / afterYieldAssetsSum;

          targetAnnualWithdraw = computeSmoothedAnnualWithdraw(
            age,
            endAge,
            afterYieldAssetsSum,
            weightedYield,
            conditions.inflationRate,
            finalNationalStartAge,
            initialNationalAmount,
            conditions.privatePensions,
            annualTotalFixedPensions
          );
        } else {
          targetAnnualWithdraw = 0;
        }
      } else {
        targetAnnualWithdraw = 0;
      }
    }

    // D. 자산에서 인출액 차감 (원금 및 수익금 정교 처리)
    let targetWithdraw = targetAnnualWithdraw;

    if (targetWithdraw <= totalEarnedYieldThisYear) {
      // [수익금이 수령희망액 이상인 경우]
      // 인출액 전액을 당해 수익금에서 차감 -> 원금(principal)은 단 1원도 감소하지 않음!
      if (totalEarnedYieldThisYear > 0) {
        assets.forEach(a => {
          const earned = earnedYieldMap.get(a.type) || 0;
          const share = targetWithdraw * (earned / totalEarnedYieldThisYear);
          a.yieldAccum += (earned - share);
        });
      }
    } else {
      // [수령희망액이 당해 발생 수익금보다 큰 경우]
      // 1) 당해 발생 수익금 가산
      assets.forEach(a => {
        const earned = earnedYieldMap.get(a.type) || 0;
        a.yieldAccum += earned;
      });

      // 2) 초과 인출액(excessWithdraw)을 우선순위 자산 잔액에서 원금/수익금 비율대로 차감
      let excessWithdraw = targetWithdraw - totalEarnedYieldThisYear;
      const assetPriority = ['cash', 'general', 'isa', 'dc', 'pensionSav', 'irp'];

      for (const priorityType of assetPriority) {
        if (excessWithdraw <= 0) break;
        const asset = assets.find(a => a.type === priorityType);
        if (asset) {
          const assetBal = asset.principal + asset.yieldAccum;
          if (assetBal > 0) {
            const deduct = Math.min(assetBal, excessWithdraw);
            excessWithdraw -= deduct;

            const pRatio = asset.principal / assetBal;
            const yRatio = asset.yieldAccum / assetBal;

            const pDeduct = Math.min(asset.principal, deduct * pRatio);
            const yDeduct = Math.min(asset.yieldAccum, deduct * yRatio);

            asset.principal = Math.max(0, asset.principal - pDeduct);
            asset.yieldAccum = Math.max(0, asset.yieldAccum - yDeduct);

            const actualDeduct = pDeduct + yDeduct;
            const remDeduct = deduct - actualDeduct;
            if (remDeduct > 0) {
              if (asset.principal >= remDeduct) {
                asset.principal -= remDeduct;
              } else {
                asset.yieldAccum = Math.max(0, asset.yieldAccum - remDeduct);
              }
            }
          }
        }
      }
    }

    // 연말 기준 최종 원금/수익금 잔액 합산
    const endPrincipal = Math.max(0, assets.reduce((sum, a) => sum + a.principal, 0));
    const endYield = Math.max(0, assets.reduce((sum, a) => sum + a.yieldAccum, 0));
    const endBalance = endPrincipal + endYield;

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

    // 자산이 0이고 연금도 모두 끝났다면 시뮬레이션 조기 중단 가능
    if (endBalance <= 100 && annualTotalIncomePreTax === 0 && age > expectedLifespan) {
      break;
    }
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
