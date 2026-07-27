import React from "react";
import { SimConditions } from "../types";
import { Sliders, ShieldAlert, CheckCircle2, DollarSign, Sparkles } from "lucide-react";

interface ConditionInputProps {
  data: SimConditions;
  onChange: (data: SimConditions) => void;
}

export const ConditionInput: React.FC<ConditionInputProps> = ({ data, onChange }) => {
  const handleFieldChange = <K extends keyof SimConditions>(field: K, value: SimConditions[K]) => {
    onChange({ ...data, [field]: value });
  };

  const handleBirthYearChange = (newBirthYear: number) => {
    const newCurrentAge = 2026 - newBirthYear;
    let newStartAge = data.withdrawalStartAge;
    if (newStartAge < newCurrentAge) {
      newStartAge = newCurrentAge;
    } else if (newStartAge > 80 && newCurrentAge < 80) {
      newStartAge = 80;
    }
    onChange({
      ...data,
      birthYear: newBirthYear,
      withdrawalStartAge: newStartAge,
    });
  };

  const handleFormattedAmountChange = (field: 'includeMonthlyAmount' | 'customMonthlyAmount', rawValue: string) => {
    const cleanValue = parseInt(rawValue.replace(/,/g, "")) || 0;
    onChange({ ...data, [field]: cleanValue });
  };

  const formatNumber = (num: number) => {
    return num.toLocaleString("ko-KR");
  };

  const currentAge = 2026 - data.birthYear;

  // Options for birth year: 1930 ~ 2020
  const birthYearOptions = Array.from({ length: 2020 - 1930 + 1 }, (_, i) => 1930 + i);

  // Options for withdrawal start age: current age ~ 80
  const startAgeOptions: number[] = [];
  if (currentAge >= 80) {
    startAgeOptions.push(currentAge);
  } else {
    for (let age = currentAge; age <= 80; age++) {
      startAgeOptions.push(age);
    }
  }

  // Options for expected lifespan: 60 ~ 100
  const lifespanOptions = Array.from({ length: 100 - 60 + 1 }, (_, i) => 60 + i);

  // Options for withdraw end age: 60 ~ 100
  const endAgeOptions = Array.from({ length: 100 - 60 + 1 }, (_, i) => 60 + i);

  // Options for optimal start age: 50 ~ 90
  const optimalStartAgeOptions = Array.from({ length: 90 - 50 + 1 }, (_, i) => 50 + i);

  // Options for inflation rate: 0.0% to 10.0% in steps of 0.1%
  const inflationOptions = Array.from({ length: 101 }, (_, i) => Number((i * 0.1).toFixed(1)));

  // Options for optimal end age depending on start age
  const currentOptimalStart = data.optimalStartAge || data.withdrawalStartAge || currentAge;
  const optimalEndAgeOptions = Array.from(
    { length: Math.max(1, 100 - currentOptimalStart + 1) },
    (_, i) => currentOptimalStart + i
  );

  return (
    <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-xs hover:shadow-md transition-all duration-300">
      <div className="flex items-center gap-2 border-b border-slate-100 pb-3 mb-5">
        <Sliders className="w-6 h-6 text-indigo-600" />
        <h3 className="text-lg font-extrabold text-indigo-950 font-display">④ 시뮬레이션 조건 설정</h3>
      </div>

      <div className="space-y-6">
        {/* ========================================================= */}
        {/* 물가상승률 및 세율 방식 */}
        {/* ========================================================= */}

        {/* ========================================================= */}
        {/* Requirement 5: 물가인상율 및 세율 방식 (예상수명 설정 바로 다음에 위치) */}
        {/* ========================================================= */}
        <div className="bg-slate-50/70 border border-slate-100 rounded-2xl p-5 space-y-4">
          <h4 className="text-xs sm:text-sm font-extrabold text-slate-800">
            물가상승률 및 은퇴 연금세율 방식
          </h4>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {/* 물가상승률 */}
            <div>
              <label className="block text-xs sm:text-sm font-extrabold text-slate-600 mb-1.5">
                매년 예상 물가상승률
              </label>
              <select
                value={data.inflationRate}
                onChange={(e) => handleFieldChange("inflationRate", parseFloat(e.target.value) || 0)}
                className="w-full bg-white border border-slate-200 rounded-lg p-2.5 text-xs sm:text-sm text-slate-800 font-bold outline-hidden cursor-pointer shadow-2xs font-mono"
                id="select-inflation-rate"
              >
                {inflationOptions.map((rate) => (
                  <option key={rate} value={rate}>
                    {rate}%
                  </option>
                ))}
              </select>
              <span className="text-xs text-slate-400 font-semibold mt-1.5 block">
                매년 생활비 보정 및 연금 수령액 연동에 적용
              </span>
            </div>

            {/* 세율 방식 */}
            <div>
              <label className="block text-xs sm:text-sm font-extrabold text-slate-600 mb-1.5">
                은퇴 연금세율 방식 선택
              </label>
              <div className="space-y-2">
                <div className="grid grid-cols-3 gap-1.5">
                  <button
                    type="button"
                    onClick={() => handleFieldChange("taxRateType", "none")}
                    className={`py-2 px-1 rounded-md text-[11px] sm:text-xs font-black border transition-all cursor-pointer ${
                      data.taxRateType === "none"
                        ? "bg-indigo-950 text-white border-indigo-950"
                        : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                    }`}
                  >
                    비과세 (0%)
                  </button>
                  <button
                    type="button"
                    onClick={() => handleFieldChange("taxRateType", "pension")}
                    className={`py-2 px-1 rounded-md text-[11px] sm:text-xs font-black border transition-all cursor-pointer ${
                      data.taxRateType === "pension"
                        ? "bg-indigo-950 text-white border-indigo-950"
                        : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                    }`}
                  >
                    연금소득세 (5.5%)
                  </button>
                  <button
                    type="button"
                    onClick={() => handleFieldChange("taxRateType", "income")}
                    className={`py-2 px-1 rounded-md text-[11px] sm:text-xs font-black border transition-all cursor-pointer ${
                      data.taxRateType === "income"
                        ? "bg-indigo-950 text-white border-indigo-950"
                        : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                    }`}
                  >
                    일반소득세 (15.4%)
                  </button>
                </div>

                <div className="flex items-center bg-white border border-slate-200 rounded-lg px-3 py-1.5">
                  <input
                    type="number"
                    step="0.1"
                    value={data.taxRateType === "custom" ? data.customTaxRate : ""}
                    onChange={(e) => {
                      handleFieldChange("taxRateType", "custom");
                      handleFieldChange("customTaxRate", parseFloat(e.target.value) || 0);
                    }}
                    placeholder="세율 직접 입력"
                    className="w-full text-right outline-hidden text-xs sm:text-sm font-mono font-bold text-slate-900"
                    id="input-custom-tax-rate"
                  />
                  <span className="text-xs sm:text-sm font-bold text-slate-500 ml-1">%</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ========================================================= */}
        {/* Requirement 5: 인출방식 4종 라디오 타일형 (물가상승률 및 세율 다음에 위치) */}
        {/* ========================================================= */}
        <div className="space-y-3 pt-2">
          <label className="block text-xs sm:text-sm font-extrabold text-slate-600 mb-1.5">
            매달 은퇴 자금 인출 방식 선택 (4종)
          </label>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5">
            {/* 1. 최적 연금 */}
            <label
              className={`flex flex-col items-center justify-center p-2.5 sm:p-4 rounded-xl border text-center cursor-pointer transition-all ${
                data.withdrawType === "optimal"
                  ? "bg-indigo-50/60 border-indigo-600 text-indigo-900 ring-2 ring-indigo-600/10"
                  : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
              }`}
            >
              <input
                type="radio"
                name="withdrawType"
                value="optimal"
                checked={data.withdrawType === "optimal"}
                onChange={() => handleFieldChange("withdrawType", "optimal")}
                className="sr-only"
              />
              <Sparkles className={`w-5 h-5 sm:w-5.5 sm:h-5.5 mb-1 ${data.withdrawType === "optimal" ? "text-indigo-600" : "text-slate-400"}`} />
              <span className="text-[11px] sm:text-sm font-black block leading-tight">최적 연금 수령</span>
              <span className="text-[9px] sm:text-[10px] text-slate-500 font-bold mt-0.5">기간 지정 완소진 배분</span>
            </label>

            {/* 2. 원금 포함 */}
            <label
              className={`flex flex-col items-center justify-center p-2.5 sm:p-4 rounded-xl border text-center cursor-pointer transition-all ${
                data.withdrawType === "include"
                  ? "bg-indigo-50/60 border-indigo-600 text-indigo-900 ring-2 ring-indigo-600/10"
                  : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
              }`}
            >
              <input
                type="radio"
                name="withdrawType"
                value="include"
                checked={data.withdrawType === "include"}
                onChange={() => handleFieldChange("withdrawType", "include")}
                className="sr-only"
              />
              <CheckCircle2 className={`w-5 h-5 sm:w-5.5 sm:h-5.5 mb-1 ${data.withdrawType === "include" ? "text-indigo-600" : "text-slate-400"}`} />
              <span className="text-[11px] sm:text-sm font-black block leading-tight">원금 포함 수령</span>
              <span className="text-[9px] sm:text-[10px] text-slate-500 font-bold mt-0.5">자산을 완전히 소진</span>
            </label>

            {/* 3. 원금 유지 */}
            <label
              className={`flex flex-col items-center justify-center p-2.5 sm:p-4 rounded-xl border text-center cursor-pointer transition-all ${
                data.withdrawType === "maintain"
                  ? "bg-indigo-50/60 border-indigo-600 text-indigo-900 ring-2 ring-indigo-600/10"
                  : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
              }`}
            >
              <input
                type="radio"
                name="withdrawType"
                value="maintain"
                checked={data.withdrawType === "maintain"}
                onChange={() => handleFieldChange("withdrawType", "maintain")}
                className="sr-only"
              />
              <ShieldAlert className={`w-5 h-5 sm:w-5.5 sm:h-5.5 mb-1 ${data.withdrawType === "maintain" ? "text-indigo-600" : "text-slate-400"}`} />
              <span className="text-[11px] sm:text-sm font-black block leading-tight">원금 유지 수령</span>
              <span className="text-[9px] sm:text-[10px] text-slate-500 font-bold mt-0.5">수익금(이자)만 인출</span>
            </label>

            {/* 4. 시작 금액 지정 수령 */}
            <label
              className={`flex flex-col items-center justify-center p-2.5 sm:p-4 rounded-xl border text-center cursor-pointer transition-all ${
                data.withdrawType === "custom"
                  ? "bg-indigo-50/60 border-indigo-600 text-indigo-900 ring-2 ring-indigo-600/10"
                  : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
              }`}
            >
              <input
                type="radio"
                name="withdrawType"
                value="custom"
                checked={data.withdrawType === "custom"}
                onChange={() => handleFieldChange("withdrawType", "custom")}
                className="sr-only"
              />
              <DollarSign className={`w-5 h-5 sm:w-5.5 sm:h-5.5 mb-1 ${data.withdrawType === "custom" ? "text-indigo-600" : "text-slate-400"}`} />
              <span className="text-[11px] sm:text-sm font-black block leading-tight">시작 금액 지정 수령</span>
              <span className="text-[9px] sm:text-[10px] text-slate-500 font-bold mt-0.5">지정한 생활비에 맞춤</span>
            </label>
          </div>
        </div>

        {/* Sub-options for Selected Withdrawal Mode */}

        {/* 1. 원금 포함 하위 서브 옵션 */}
        {data.withdrawType === "include" && (
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 animate-in fade-in slide-in-from-top-1 duration-200">
            <div>
              <label className="block text-xs sm:text-sm font-extrabold text-slate-600 mb-1.5">수령 희망 종료 나이 설정</label>
              <select
                value={data.withdrawEndAge || data.expectedLifespan || ""}
                onChange={(e) => handleFieldChange("withdrawEndAge", parseInt(e.target.value) || 0)}
                className="bg-white border border-slate-200 rounded-lg p-2.5 text-xs sm:text-sm text-slate-800 font-bold outline-hidden cursor-pointer shadow-2xs w-full max-w-[280px]"
                id="select-withdraw-end-age"
              >
                <option value="">선택하세요</option>
                {endAgeOptions.map((age) => (
                  <option key={age} value={age}>
                    만 {age}세 말 자산소진 완료
                  </option>
                ))}
              </select>
              <span className="text-xs text-slate-500 font-bold mt-2.5 block leading-relaxed">
                ※ 기본 정보의 예상 수명{data.expectedLifespan > 0 ? `(만 ${data.expectedLifespan}세)` : ""}이 기본 적용되며, 원하시는 나이로 직접 변경이 가능합니다.
              </span>
            </div>
          </div>
        )}

        {/* 2. 시작 금액 지정 수령 하위 서브 옵션 */}
        {data.withdrawType === "custom" && (
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 animate-in fade-in slide-in-from-top-1 duration-200">
            <label className="block text-xs sm:text-sm font-extrabold text-slate-600 mb-1.5">
              수급 최초년도 희망 월 총수령액 (세전, 국민연금/사적연금 포함 총합계)
            </label>
            <div className="flex items-center bg-white border border-slate-200 rounded-lg px-3.5 py-2.5 max-w-[320px] shadow-2xs">
              <input
                type="text"
                value={data.customMonthlyAmount === 0 ? "" : formatNumber(data.customMonthlyAmount)}
                onChange={(e) => handleFormattedAmountChange("customMonthlyAmount", e.target.value)}
                onFocus={() => handleFieldChange("customMonthlyAmount", 0)}
                placeholder="0"
                className="w-full text-right outline-hidden text-sm sm:text-base font-mono font-bold text-slate-900"
                id="input-custom-monthly-amount"
              />
              <span className="text-xs sm:text-sm font-bold text-slate-500 ml-1.5">원</span>
            </div>
            <span className="text-xs text-slate-500 font-bold mt-2 block leading-relaxed">
              ※ 클릭 시 기존 금액이 지워집니다. 수급 시작년도 기준 금액이며, 매년 물가상승률만큼 증액되고 고정연금을 차감한 부족분만 자산에서 인출됩니다.
            </span>
          </div>
        )}

        {/* 3. Requirement 3: 최적 연금 하위 서브 옵션 (시작년도/나이 ~ 마지막년도/나이) */}
        {data.withdrawType === "optimal" && (
          <div className="bg-indigo-50/50 border border-indigo-100 rounded-xl p-5 space-y-4 animate-in fade-in slide-in-from-top-1 duration-200">
            <div className="space-y-1">
              <h4 className="text-xs sm:text-sm font-extrabold text-indigo-950 flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-indigo-600" /> 최적 연금 소진 기간 설정
              </h4>
              <p className="text-xs text-slate-500 font-bold leading-relaxed">
                시작년도부터 마지막년도까지 내가 가진 총 자산을 물가상승률과 기간 투자 수익금을 반영하여 완전 소진(0원)하도록 최적으로 설계 배분합니다.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              {/* 시작 년도 / 나이 */}
              <div>
                <label className="block text-xs sm:text-sm font-extrabold text-slate-700 mb-1.5">
                  연금 시작 나이 / 년도
                </label>
                <select
                  value={data.optimalStartAge || ""}
                  onChange={(e) => {
                    const start = parseInt(e.target.value) || 0;
                    const end = Math.max(start, data.optimalEndAge || data.expectedLifespan || 90);
                    onChange({ ...data, optimalStartAge: start, optimalEndAge: end });
                  }}
                  className="w-full bg-white border border-slate-200 rounded-lg p-2.5 text-xs sm:text-sm text-slate-800 font-bold outline-hidden cursor-pointer shadow-2xs"
                  id="select-optimal-start-age"
                >
                  <option value="">선택하세요</option>
                  {optimalStartAgeOptions.map((age) => (
                    <option key={age} value={age}>
                      만 {age}세 {data.birthYear > 0 ? `(${data.birthYear + age}년 시작)` : "시작"}
                    </option>
                  ))}
                </select>
              </div>

              {/* 마지막 년도 / 나이 */}
              <div>
                <label className="block text-xs sm:text-sm font-extrabold text-slate-700 mb-1.5">
                  연금 마지막 나이 / 년도
                </label>
                <select
                  value={data.optimalEndAge || ""}
                  onChange={(e) => handleFieldChange("optimalEndAge", parseInt(e.target.value) || 0)}
                  className="w-full bg-white border border-slate-200 rounded-lg p-2.5 text-xs sm:text-sm text-slate-800 font-bold outline-hidden cursor-pointer shadow-2xs"
                  id="select-optimal-end-age"
                >
                  <option value="">선택하세요</option>
                  {optimalEndAgeOptions.map((age) => (
                    <option key={age} value={age}>
                      만 {age}세 {data.birthYear > 0 ? `(${data.birthYear + age}년 종료)` : "종료"}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
