import React from "react";
import { SimConditions } from "../types";
import { UserCheck } from "lucide-react";

interface BasicInfoInputProps {
  data: SimConditions;
  onChange: (data: SimConditions) => void;
}

export const BasicInfoInput: React.FC<BasicInfoInputProps> = ({ data, onChange }) => {
  const handleFieldChange = <K extends keyof SimConditions>(field: K, value: SimConditions[K]) => {
    onChange({ ...data, [field]: value });
  };

  const handleBirthYearChange = (newBirthYear: number) => {
    if (newBirthYear === 0) {
      onChange({ ...data, birthYear: 0, withdrawalStartAge: 0 });
      return;
    }
    const newCurrentAge = 2026 - newBirthYear;
    let newStartAge = data.withdrawalStartAge;
    if (newStartAge > 0 && newStartAge < newCurrentAge) {
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

  const currentAge = data.birthYear > 0 ? 2026 - data.birthYear : 0;

  // Options for birth year: 1930 ~ 2020
  const birthYearOptions = Array.from({ length: 2020 - 1930 + 1 }, (_, i) => 1930 + i);

  // Options for withdrawal start age: current age ~ 80
  const startAgeOptions: number[] = [];
  const minStartAge = currentAge > 0 ? currentAge : 50;
  if (minStartAge >= 80) {
    startAgeOptions.push(minStartAge);
  } else {
    for (let age = minStartAge; age <= 80; age++) {
      startAgeOptions.push(age);
    }
  }

  // Options for expected lifespan: 60 ~ 100
  const lifespanOptions = Array.from({ length: 100 - 60 + 1 }, (_, i) => 60 + i);

  return (
    <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-xs hover:shadow-md transition-all duration-300">
      <div className="flex items-center gap-2 border-b border-slate-100 pb-3 mb-5">
        <UserCheck className="w-6 h-6 text-indigo-600" />
        <h3 className="text-lg font-extrabold text-indigo-950 font-display">① 기본 정보</h3>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 bg-slate-50/50 border border-slate-100 rounded-2xl p-5">
        {/* ① 출생년도 */}
        <div className="flex flex-col items-stretch p-4 bg-white rounded-xl border border-slate-100 shadow-2xs">
          <span className="block text-xs sm:text-sm font-black text-slate-700 mb-2.5 text-center">
            출생년도
          </span>
          <select
            value={data.birthYear || ""}
            onChange={(e) => handleBirthYearChange(parseInt(e.target.value) || 0)}
            className="w-full bg-white border border-slate-200 rounded-lg p-2.5 text-xs sm:text-sm text-slate-800 font-bold outline-hidden cursor-pointer shadow-2xs text-center"
            id="select-birth-year"
          >
            <option value="">선택하세요</option>
            {birthYearOptions.map((year) => (
              <option key={year} value={year}>
                {year}년생 (만 {2026 - year}세)
              </option>
            ))}
          </select>
          <span className="text-[11px] text-indigo-600 font-extrabold mt-3 text-center block">
            {data.birthYear > 0
              ? `만 나이 기준시점: 2026년 말 (만 ${2026 - data.birthYear}세)`
              : "만 나이 기준시점: 2026년 말"}
          </span>
        </div>

        {/* ② 연금자산 수급희망년도 */}
        <div className="flex flex-col items-stretch p-4 bg-white rounded-xl border border-slate-100 shadow-2xs">
          <span className="block text-xs sm:text-sm font-black text-slate-700 mb-2.5 text-center">
            연금자산 수급희망년도
          </span>
          <select
            value={data.withdrawalStartAge || ""}
            onChange={(e) => handleFieldChange("withdrawalStartAge", parseInt(e.target.value) || 0)}
            className="w-full bg-white border border-slate-200 rounded-lg p-2.5 text-xs sm:text-sm text-slate-800 font-bold outline-hidden cursor-pointer shadow-2xs text-center"
            id="select-withdrawal-start-age"
          >
            <option value="">선택하세요</option>
            {startAgeOptions.map((age) => (
              <option key={age} value={age}>
                만 {age}세 {data.birthYear > 0 ? `(${data.birthYear + age}년 개시)` : "개시"}
              </option>
            ))}
          </select>
          <span className="text-[11px] text-slate-500 font-bold mt-3 text-center block leading-relaxed">
            은퇴자산 인출 시작 시점 (최대 80세)
          </span>
        </div>

        {/* ③ 예상 수명 */}
        <div className="flex flex-col items-stretch p-4 bg-white rounded-xl border border-slate-100 shadow-2xs">
          <span className="block text-xs sm:text-sm font-black text-slate-700 mb-2.5 text-center">
            예상 수명
          </span>
          <select
            value={data.expectedLifespan || ""}
            onChange={(e) => handleFieldChange("expectedLifespan", parseInt(e.target.value) || 0)}
            className="w-full bg-white border border-slate-200 rounded-lg p-2.5 text-xs sm:text-sm text-slate-800 font-bold outline-hidden cursor-pointer shadow-2xs text-center"
            id="select-expected-lifespan"
          >
            <option value="">선택하세요</option>
            {lifespanOptions.map((age) => (
              <option key={age} value={age}>
                만 {age}세까지 은퇴 분석
              </option>
            ))}
          </select>
          <span className="text-[11px] text-slate-400 font-semibold text-center mt-3 block leading-relaxed">
            최종 시뮬레이션 종료 지점
          </span>
        </div>
      </div>
    </div>
  );
};
