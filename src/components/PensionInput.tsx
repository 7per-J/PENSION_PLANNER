import React, { useState } from "react";
import { PensionIncome, PrivatePensionItem } from "../types";
import { HelpCircle, X, Wallet, Award, ShieldCheck, PlusCircle, Trash2, Calendar } from "lucide-react";
import { getNationalBaseAge } from "../utils/simulation";

interface PensionInputProps {
  data: PensionIncome;
  birthYear: number;
  onChange: (data: PensionIncome) => void;
  privatePensions: PrivatePensionItem[];
  onPrivatePensionsChange: (pensions: PrivatePensionItem[]) => void;
}

export const PensionInput: React.FC<PensionInputProps> = ({
  data,
  birthYear,
  onChange,
  privatePensions,
  onPrivatePensionsChange,
}) => {
  const [showPopover, setShowPopover] = useState(false);

  const baseNationalAge = getNationalBaseAge(birthYear);
  const actualNationalAge = baseNationalAge + data.nationalTiming;
  const startYear = birthYear + actualNationalAge;

  const handleFieldChange = (field: keyof PensionIncome, value: number) => {
    onChange({ ...data, [field]: value });
  };

  const formatNumber = (num: number) => {
    return num.toLocaleString("ko-KR");
  };

  const startAgeOptions = Array.from({ length: 31 }, (_, i) => 50 + i); // 50~80세

  const handleAddPrivatePension = () => {
    if (privatePensions.length >= 5) return;
    const newItem: PrivatePensionItem = {
      id: Date.now().toString(),
      name: `사적연금보험 ${privatePensions.length + 1}`,
      monthlyAmount: 500000,
      pensionType: "whole",
      startAge: 65,
      endAge: 85,
    };
    onPrivatePensionsChange([...privatePensions, newItem]);
  };

  const handleUpdatePrivatePension = (id: string, updated: Partial<PrivatePensionItem>) => {
    onPrivatePensionsChange(
      privatePensions.map((p) => (p.id === id ? { ...p, ...updated } : p))
    );
  };

  const handleRemovePrivatePension = (id: string) => {
    onPrivatePensionsChange(privatePensions.filter((p) => p.id !== id));
  };

  return (
    <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-xs hover:shadow-md transition-all duration-300">
      <div className="flex items-center gap-2 border-b border-slate-100 pb-3 mb-5">
        <Wallet className="w-6 h-6 text-indigo-600" />
        <h3 className="text-lg font-extrabold text-indigo-950 font-display">① 연금소득 입력</h3>
      </div>

      <div className="space-y-6">
        {/* 국민연금 */}
        <div className="bg-slate-50/50 border border-slate-100 rounded-xl p-5 relative">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
            <span className="flex items-center gap-1.5 text-sm sm:text-base font-extrabold text-indigo-950">
              <Award className="w-5 h-5 text-indigo-500" />
              국민연금 (평생 지급)
            </span>
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowPopover(!showPopover)}
                className="text-slate-500 hover:text-indigo-600 font-bold transition-colors flex items-center gap-1 text-xs cursor-pointer"
                id="btn-national-help"
              >
                예상수령액 확인 방법 <HelpCircle className="w-4 h-4" />
              </button>

              {/* 국민연금 예상수령액 확인 팝오버 */}
              {showPopover && (
                <div className="absolute right-0 top-7 z-50 w-80 bg-slate-900 text-slate-100 rounded-xl p-5 shadow-xl border border-slate-800 animate-in fade-in zoom-in duration-200">
                  <div className="flex justify-between items-start mb-3">
                    <h4 className="text-xs font-extrabold text-white flex items-center gap-1">
                      🔍 국민연금 예상월수령액 확인 방법
                    </h4>
                    <button
                      type="button"
                      onClick={() => setShowPopover(false)}
                      className="text-slate-400 hover:text-white cursor-pointer"
                      id="btn-close-popover"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                  <div className="text-xs text-slate-300 space-y-2 leading-relaxed">
                    <p>
                      <strong>'내 곁에 국민연금'</strong> 모바일 앱에 공동인증서, 네이버, 카카오페이 등으로 로그인한 후
                    </p>
                    <p className="bg-slate-800/80 p-2 rounded text-center text-indigo-300 font-extrabold border border-slate-700/50 text-xs">
                      '예상연금액 조회'
                    </p>
                    <p>메뉴에서 약 1분 만에 편리하고 정확하게 확인할 수 있습니다.</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowPopover(false)}
                    className="mt-3.5 w-full bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-extrabold py-2 rounded-lg transition-colors cursor-pointer"
                  >
                    확인 완료 및 닫기
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs sm:text-sm font-extrabold text-slate-600 mb-1.5">예상 월 수령액 (현재 가치)</label>
              <div className="flex items-center bg-white border border-slate-200 rounded-lg px-3.5 py-2.5 shadow-2xs">
                <input
                  type="text"
                  value={data.nationalAmount === 0 ? "" : formatNumber(data.nationalAmount)}
                  onChange={(e) => {
                    const cleanValue = parseInt(e.target.value.replace(/,/g, "")) || 0;
                    handleFieldChange("nationalAmount", cleanValue);
                  }}
                  onFocus={() => handleFieldChange("nationalAmount", 0)}
                  placeholder="0"
                  className="w-full text-right outline-hidden text-sm sm:text-base font-mono font-bold text-slate-900"
                  id="input-national-amount"
                />
                <span className="text-xs sm:text-sm font-bold text-slate-500 ml-1.5">원</span>
              </div>
            </div>

            <div>
              <label className="block text-xs sm:text-sm font-extrabold text-slate-600 mb-1.5">수령 시기 선택 (연기/조기)</label>
              <select
                value={data.nationalTiming}
                onChange={(e) => handleFieldChange("nationalTiming", parseInt(e.target.value))}
                className="w-full bg-white border border-slate-200 rounded-lg p-2.5 text-xs sm:text-sm text-slate-800 font-bold outline-hidden cursor-pointer"
                id="select-national-timing"
              >
                <option value="-5">5년 조기 수령 (-30% 감액)</option>
                <option value="-4">4년 조기 수령 (-24% 감액)</option>
                <option value="-3">3년 조기 수령 (-18% 감액)</option>
                <option value="-2">2년 조기 수령 (-12% 감액)</option>
                <option value="-1">1년 조기 수령 (-6% 감액)</option>
                <option value="0">정상 개시 (65세)</option>
                <option value="1">1년 연기 수령 (+7.2% 증액)</option>
                <option value="2">2년 연기 수령 (+14.4% 증액)</option>
                <option value="3">3년 연기 수령 (+21.6% 증액)</option>
                <option value="4">4년 연기 수령 (+28.8% 증액)</option>
                <option value="5">5년 연기 수령 (+36.0% 증액)</option>
              </select>
            </div>
          </div>

          <div className="mt-3.5 space-y-2">
            <p className="text-xs sm:text-sm font-bold text-indigo-900 bg-indigo-50/70 p-2.5 rounded-lg border border-indigo-100/80">
              💡 국민연금은 수령시기에 따라 개시금액이 감액되거나 가산됩니다.
            </p>
            <div className="text-xs sm:text-sm text-slate-500 font-bold bg-slate-100/60 p-2.5 rounded-lg border border-slate-100">
              기본 수령 나이: 만 {baseNationalAge}세 | 실제 수령 시작 나이:{" "}
              <span className="text-indigo-600 font-extrabold text-sm sm:text-base underline underline-offset-2">만 {actualNationalAge}세</span> ({startYear}년)
            </div>
          </div>
        </div>

        {/* ========================================================= */}
        {/* 종신연금 OR 사적연금보험 수령액 추가 (최대 5개) SECTION */}
        {/* ========================================================= */}
        <div className="pt-2 border-t border-slate-100 space-y-4">
          <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-purple-600" />
              <h4 className="text-sm sm:text-base font-extrabold text-slate-900">
                종신연금 / 사적연금보험 추가 <span className="text-xs text-purple-600 font-bold">(최대 5개)</span>
              </h4>
            </div>

            <button
              type="button"
              onClick={handleAddPrivatePension}
              disabled={privatePensions.length >= 5}
              className="bg-purple-600 hover:bg-purple-700 disabled:bg-slate-300 text-white font-extrabold text-xs sm:text-sm py-2 px-3.5 rounded-lg flex items-center gap-1.5 transition-all cursor-pointer disabled:cursor-not-allowed shadow-2xs self-start sm:self-auto"
              id="btn-add-private-pension"
            >
              <PlusCircle className="w-4 h-4" /> 사적연금보험 추가 ({privatePensions.length}/5)
            </button>
          </div>

          {privatePensions.length === 0 ? (
            <div className="bg-purple-50/40 border border-purple-100/80 rounded-xl p-4 text-center text-xs text-purple-900/80 font-bold">
              💡 보유하신 종신연금이나 사적연금보험이 있다면 등록해 보세요. (물가상승률 미적용 고정액 및 비과세/소득세 미적용으로 시뮬레이션에 정교하게 반영됩니다)
            </div>
          ) : (
            <div className="space-y-3.5">
              {privatePensions.map((item, idx) => {
                const endAgeOptions = Array.from(
                  { length: Math.max(1, 100 - item.startAge + 1) },
                  (_, i) => item.startAge + i
                );

                return (
                  <div
                    key={item.id}
                    className="bg-purple-50/30 border border-purple-100 rounded-2xl p-4 space-y-3 relative hover:border-purple-200 transition-all"
                  >
                    <div className="flex items-center justify-between gap-2 border-b border-purple-100/60 pb-2.5">
                      <div className="flex items-center gap-2 flex-1 max-w-xs">
                        <span className="bg-purple-600 text-white text-[10px] font-black px-2 py-0.5 rounded-md">
                          연금 {idx + 1}
                        </span>
                        <input
                          type="text"
                          value={item.name}
                          onChange={(e) => handleUpdatePrivatePension(item.id, { name: e.target.value })}
                          placeholder="보험 명칭 입력"
                          className="text-xs sm:text-sm font-black text-slate-900 bg-white border border-slate-200 rounded-md px-2.5 py-1 w-full focus:ring-2 focus:ring-purple-500/20 outline-hidden"
                          id={`input-private-pension-name-${item.id}`}
                        />
                      </div>

                      <button
                        type="button"
                        onClick={() => handleRemovePrivatePension(item.id)}
                        className="text-slate-400 hover:text-rose-600 p-1 transition-colors cursor-pointer"
                        title="삭제"
                        id={`btn-delete-private-pension-${item.id}`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 items-end">
                      {/* Monthly Amount */}
                      <div>
                        <label className="block text-[11px] font-black text-slate-600 mb-1">
                          예상 월 수령액 (현재 가치)
                        </label>
                        <div className="flex items-center bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 shadow-2xs">
                          <input
                            type="text"
                            value={item.monthlyAmount === 0 ? "" : item.monthlyAmount.toLocaleString("ko-KR")}
                            onChange={(e) => {
                              const val = parseInt(e.target.value.replace(/,/g, "")) || 0;
                              handleUpdatePrivatePension(item.id, { monthlyAmount: val });
                            }}
                            onFocus={() => handleUpdatePrivatePension(item.id, { monthlyAmount: 0 })}
                            placeholder="0"
                            className="w-full text-right outline-hidden text-xs sm:text-sm font-mono font-bold text-slate-900"
                            id={`input-private-pension-amount-${item.id}`}
                          />
                          <span className="text-xs font-bold text-slate-500 ml-1">원</span>
                        </div>
                      </div>

                      {/* Pension Type: Whole vs Period */}
                      <div>
                        <label className="block text-[11px] font-black text-slate-600 mb-1">
                          연금 유형 선택
                        </label>
                        <div className="grid grid-cols-2 gap-1 bg-slate-100 p-1 rounded-lg border border-slate-200">
                          <button
                            type="button"
                            onClick={() => handleUpdatePrivatePension(item.id, { pensionType: "whole" })}
                            className={`py-1 text-[11px] font-extrabold rounded-md transition-all cursor-pointer ${
                              item.pensionType === "whole"
                                ? "bg-purple-600 text-white shadow-xs"
                                : "text-slate-600 hover:text-slate-900"
                            }`}
                          >
                            종신 연금
                          </button>
                          <button
                            type="button"
                            onClick={() => handleUpdatePrivatePension(item.id, { pensionType: "period" })}
                            className={`py-1 text-[11px] font-extrabold rounded-md transition-all cursor-pointer ${
                              item.pensionType === "period"
                                ? "bg-purple-600 text-white shadow-xs"
                                : "text-slate-600 hover:text-slate-900"
                            }`}
                          >
                            기간 지정
                          </button>
                        </div>
                      </div>

                      {/* Start Age & End Age */}
                      <div className="grid grid-cols-2 gap-2 col-span-1 sm:col-span-2 md:col-span-1">
                        <div>
                          <label className="block text-[11px] font-black text-slate-600 mb-1">
                            시작 나이/년도
                          </label>
                          <select
                            value={item.startAge}
                            onChange={(e) => {
                              const start = parseInt(e.target.value) || 65;
                              const end = Math.max(start, item.endAge);
                              handleUpdatePrivatePension(item.id, { startAge: start, endAge: end });
                            }}
                            className="w-full bg-white border border-slate-200 rounded-lg p-1.5 text-xs text-slate-800 font-bold outline-hidden cursor-pointer shadow-2xs"
                            id={`select-private-pension-start-${item.id}`}
                          >
                            {startAgeOptions.map((age) => (
                              <option key={age} value={age}>
                                만 {age}세 ({birthYear + age}년)
                              </option>
                            ))}
                          </select>
                        </div>

                        {item.pensionType === "period" ? (
                          <div>
                            <label className="block text-[11px] font-black text-slate-600 mb-1">
                              마지막 나이/년도
                            </label>
                            <select
                              value={item.endAge}
                              onChange={(e) => {
                                handleUpdatePrivatePension(item.id, {
                                  endAge: parseInt(e.target.value) || item.startAge,
                                });
                              }}
                              className="w-full bg-white border border-slate-200 rounded-lg p-1.5 text-xs text-slate-800 font-bold outline-hidden cursor-pointer shadow-2xs"
                              id={`select-private-pension-end-${item.id}`}
                            >
                              {endAgeOptions.map((age) => (
                                <option key={age} value={age}>
                                  만 {age}세 ({birthYear + age}년)
                                </option>
                              ))}
                            </select>
                          </div>
                        ) : (
                          <div className="flex items-center justify-center bg-slate-100/70 border border-slate-200 rounded-lg p-1.5">
                            <span className="text-[11px] font-extrabold text-purple-700 flex items-center gap-1">
                              <Calendar className="w-3.5 h-3.5" /> 사망 시까지
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

