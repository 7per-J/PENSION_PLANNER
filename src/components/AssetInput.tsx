import React from "react";
import { FinancialAssets } from "../types";
import { Landmark, ArrowUpRight } from "lucide-react";

interface AssetInputProps {
  data: FinancialAssets;
  onChange: (data: FinancialAssets) => void;
}

export const AssetInput: React.FC<AssetInputProps> = ({
  data,
  onChange,
}) => {
  const formatKoreanCurrency = (amount: number) => {
    if (!amount || amount === 0) return "0원";
    const eok = Math.floor(amount / 100000000);
    const man = Math.floor((amount % 100000000) / 10000);

    let result = "";
    if (eok > 0) result += `${eok}억 `;
    if (man > 0) result += `${man.toLocaleString("ko-KR")}만`;
    return result.trim() + "원";
  };

  const totalAssetsSum =
    (data.irp || 0) +
    (data.pensionSav || 0) +
    (data.dc || 0) +
    (data.isa || 0) +
    (data.general || 0) +
    (data.cash || 0);

  const assetRows = [
    {
      label: "개인형 IRP",
      badge: "IRP",
      badgeClass: "bg-blue-50 text-blue-700 border-blue-100",
      amountKey: "irp" as keyof FinancialAssets,
      yieldKey: "irpYield" as keyof FinancialAssets,
    },
    {
      label: "연금저축계좌",
      badge: "연금저축",
      badgeClass: "bg-teal-50 text-teal-700 border-teal-100",
      amountKey: "pensionSav" as keyof FinancialAssets,
      yieldKey: "pensionSavYield" as keyof FinancialAssets,
    },
    {
      label: "퇴직연금 DC형 잔액",
      badge: "DC",
      badgeClass: "bg-indigo-50 text-indigo-700 border-indigo-100",
      amountKey: "dc" as keyof FinancialAssets,
      yieldKey: "dcYield" as keyof FinancialAssets,
    },
    {
      label: "ISA 종합자산계좌",
      badge: "ISA",
      badgeClass: "bg-purple-50 text-purple-700 border-purple-100",
      amountKey: "isa" as keyof FinancialAssets,
      yieldKey: "isaYield" as keyof FinancialAssets,
    },
    {
      label: "일반 주식/예적금",
      badge: "일반",
      badgeClass: "bg-slate-50 text-slate-700 border-slate-200",
      amountKey: "general" as keyof FinancialAssets,
      yieldKey: "generalYield" as keyof FinancialAssets,
    },
    {
      label: "현금 / CMA 잔액",
      badge: "현금",
      badgeClass: "bg-emerald-50 text-emerald-700 border-emerald-100",
      amountKey: "cash" as keyof FinancialAssets,
      yieldKey: "cashYield" as keyof FinancialAssets,
    },
  ];

  // Yield options covering 0% to 20% in steps of 0.5%
  const yieldOptions = Array.from({ length: 41 }, (_, i) => Number((i * 0.5).toFixed(1)));

  return (
    <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-xs hover:shadow-md transition-all duration-300">
      <div className="flex items-center gap-2 border-b border-slate-100 pb-3 mb-5">
        <Landmark className="w-6 h-6 text-indigo-600" />
        <h3 className="text-lg font-extrabold text-indigo-950 font-display">③ 금융자산 입력</h3>
      </div>

      <div className="space-y-6">
        <p className="text-xs text-slate-400 font-medium">
          ※ 평가액 칸을 클릭(터치)하면 기존 금액이 지워져 새로 입력하기 편리합니다. 연이율은 리스트에서 선택할 수 있습니다.
        </p>

        {/* Dynamic Asset Cards */}
        <div className="space-y-4">
          {assetRows.map((row) => {
            const totalVal = (data[row.amountKey] as number) || 0;
            const currentYield = (data[row.yieldKey] as number) || 0;

            return (
              <div
                key={row.amountKey}
                className="bg-slate-50/30 border border-slate-100 rounded-2xl p-4.5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4.5 hover:border-slate-200/80 hover:bg-slate-50/50 transition-all duration-200"
              >
                {/* Left: Info details */}
                <div className="space-y-1.5 w-full md:w-1/3">
                  <div className="flex items-center gap-1.5">
                    <span
                      className={`text-[10px] sm:text-xs px-2 py-0.5 rounded-sm border font-extrabold ${row.badgeClass}`}
                    >
                      {row.badge}
                    </span>
                    <h4 className="text-sm font-black text-slate-800">{row.label}</h4>
                  </div>
                  <div className="text-[11px] text-slate-500 font-semibold" id={`label-summary-${row.amountKey}`}>
                    평가액 실시간 변환: <span className="font-extrabold text-indigo-600 font-mono">{formatKoreanCurrency(totalVal)}</span>
                  </div>
                </div>

                {/* Right: Asset input & yield select */}
                <div className="flex flex-col sm:flex-row gap-4 w-full md:w-2/3 justify-end items-stretch sm:items-center">
                  {/* Amount Numeric Input (Clears on focus) */}
                  <div className="flex-1 max-w-sm">
                    <label className="block text-[11px] font-black text-slate-500 mb-1">평가액 입력</label>
                    <div className="flex items-center bg-white border border-slate-200 rounded-lg px-3 py-2 w-full shadow-2xs">
                      <input
                        type="text"
                        value={totalVal === 0 ? "" : totalVal.toLocaleString("ko-KR")}
                        onChange={(e) => {
                          const cleanValue = parseInt(e.target.value.replace(/,/g, "")) || 0;
                          onChange({ ...data, [row.amountKey]: cleanValue });
                        }}
                        onFocus={() => {
                          onChange({ ...data, [row.amountKey]: 0 });
                        }}
                        placeholder="0"
                        className="w-full text-right outline-hidden text-sm sm:text-base font-mono font-bold text-slate-900"
                        id={`input-asset-amount-${row.amountKey}`}
                      />
                      <span className="text-xs sm:text-sm font-bold text-slate-500 ml-1.5">원</span>
                    </div>
                  </div>

                  {/* Yield Select Dropdown */}
                  <div className="w-full sm:w-36">
                    <label className="block text-[11px] font-black text-slate-500 mb-1">예상 수익률 (연)</label>
                    <select
                      value={currentYield}
                      onChange={(e) => {
                        onChange({ ...data, [row.yieldKey]: parseFloat(e.target.value) || 0 });
                      }}
                      className="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs sm:text-sm text-slate-800 font-bold outline-hidden cursor-pointer shadow-2xs"
                      id={`select-asset-yield-${row.amountKey}`}
                    >
                      {yieldOptions.map((val) => (
                        <option key={val} value={val}>
                          {val}%
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Total Assets Summary */}
        <div className="flex justify-between items-center bg-indigo-50/50 border border-indigo-100 rounded-xl p-4.5">
          <span className="text-sm sm:text-base font-extrabold text-indigo-950 flex items-center gap-1">
            금융자산 총합계 <ArrowUpRight className="w-4 h-4 text-indigo-500" />
          </span>
          <strong className="text-lg sm:text-xl font-black text-indigo-700 font-mono tracking-tight" id="text-total-assets-sum">
            {formatKoreanCurrency(totalAssetsSum)}
          </strong>
        </div>
      </div>
    </div>
  );
};
